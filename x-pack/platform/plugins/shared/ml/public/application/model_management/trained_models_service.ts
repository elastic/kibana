/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { Subscription, of, from, merge, pairwise, delay, EMPTY, combineLatest } from 'rxjs';
import {
  BehaviorSubject,
  Subject,
  timer,
  switchMap,
  takeUntil,
  distinctUntilChanged,
  map,
  shareReplay,
  tap,
  take,
  finalize,
  withLatestFrom,
  filter,
  catchError,
} from 'rxjs';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import { isEqual } from 'lodash';
import type { ErrorType } from '@kbn/ml-error-utils';
import { i18n } from '@kbn/i18n';
import {
  isBaseNLPModelItem,
  isNLPModelItem,
  type ModelDownloadState,
  type TrainedModelUIItem,
} from '../../../common/types/trained_models';
import type {
  CommonDeploymentParams,
  AdaptiveAllocationsParams,
} from '../services/ml_api_service/trained_models';
import { type TrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type { SavedObjectsApiService } from '../services/ml_api_service/saved_objects';

interface ModelDownloadStatus {
  [modelId: string]: ModelDownloadState;
}

const DOWNLOAD_POLL_INTERVAL = 3000;

export interface ModelDeploymentParams {
  modelId: string;
  deploymentParams: CommonDeploymentParams;
  adaptiveAllocationsParams?: AdaptiveAllocationsParams;
}

interface TrainedModelsServiceInit {
  scheduledDeployments$: BehaviorSubject<ModelDeploymentParams[]>;
  setScheduledDeployments: (deployments: ModelDeploymentParams[]) => void;
  displayErrorToast: (error: ErrorType, title?: string) => void;
  displaySuccessToast: (toast: { title: string; text: string }) => void;
  savedObjectsApiService: SavedObjectsApiService;
  canManageSpacesAndSavedObjects: boolean;
}

export class TrainedModelsService {
  private readonly _reloadSubject$ = new Subject();

  private readonly _modelItems$ = new BehaviorSubject<TrainedModelUIItem[]>([]);
  private readonly stopPolling$ = new Subject<void>();
  private readonly cancelDeployment$ = new Subject<string>();
  private readonly downloadStatus$ = new BehaviorSubject<ModelDownloadStatus>({});
  private readonly downloadInProgress = new Set<string>();
  private readonly deploymentInProgress = new Set<string>();
  private pollingSubscription?: Subscription;
  private abortedDownloads = new Set<string>();
  private downloadStatusFetchInProgress = false;
  public isInitialized = false;
  private setScheduledDeployments?: (deployingModels: ModelDeploymentParams[]) => void;
  private displayErrorToast?: (error: ErrorType, title?: string) => void;
  private displaySuccessToast?: (toast: { title: string; text: string }) => void;
  private subscription!: Subscription;
  private _scheduledDeployments$ = new BehaviorSubject<ModelDeploymentParams[]>([]);
  private destroySubscription?: Subscription;
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  private savedObjectsApiService!: SavedObjectsApiService;
  private canManageSpacesAndSavedObjects!: boolean;

  constructor(private readonly trainedModelsApiService: TrainedModelsApiService) {}

  public init({
    scheduledDeployments$,
    setScheduledDeployments,
    displayErrorToast,
    displaySuccessToast,
    savedObjectsApiService,
    canManageSpacesAndSavedObjects,
  }: TrainedModelsServiceInit) {
    // Always cancel any pending destroy when trying to initialize
    if (this.destroySubscription) {
      this.destroySubscription.unsubscribe();
      this.destroySubscription = undefined;
    }

    if (this.isInitialized) return;

    this.subscription = new Subscription();
    this.isInitialized = true;
    this.canManageSpacesAndSavedObjects = canManageSpacesAndSavedObjects;

    this.setScheduledDeployments = setScheduledDeployments;
    this._scheduledDeployments$ = scheduledDeployments$;
    this.displayErrorToast = displayErrorToast;
    this.displaySuccessToast = displaySuccessToast;
    this.savedObjectsApiService = savedObjectsApiService;

    this.setupFetchingSubscription();
    this.setupDeploymentSubscription();
  }

  public readonly isLoading$ = this._isLoading$.pipe(distinctUntilChanged());

  public readonly modelItems$: Observable<TrainedModelUIItem[]> = this._modelItems$.pipe(
    distinctUntilChanged(isEqual),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public get activeDeployments$(): Observable<ModelDeploymentParams[]> {
    return this._scheduledDeployments$;
  }

  public get activeDeployments(): ModelDeploymentParams[] {
    return this._scheduledDeployments$.getValue();
  }

  public get modelItems(): TrainedModelUIItem[] {
    return this._modelItems$.getValue();
  }

  public get isLoading(): boolean {
    return this._isLoading$.getValue();
  }

  public fetchModels() {
    const timestamp = Date.now();
    this._reloadSubject$.next(timestamp);
  }

  public startModelDeployment(
    modelId: string,
    deploymentParams: CommonDeploymentParams,
    adaptiveAllocationsParams?: AdaptiveAllocationsParams
  ) {
    const newDeployment = {
      modelId,
      deploymentParams,
      adaptiveAllocationsParams,
    };
    const currentDeployments = this._scheduledDeployments$.getValue();
    this.setScheduledDeployments?.([...currentDeployments, newDeployment]);
  }

  public downloadModel(modelId: string) {
    this.downloadInProgress.add(modelId);
    this._isLoading$.next(true);
    from(this.trainedModelsApiService.installElasticTrainedModelConfig(modelId))
      .pipe(
        finalize(() => {
          this.downloadInProgress.delete(modelId);
          this._isLoading$.next(false);
          this.fetchModels();
        })
      )
      .subscribe({
        error: (error) => {
          this.displayErrorToast?.(
            error,
            i18n.translate('xpack.ml.trainedModels.modelsList.downloadFailed', {
              defaultMessage: 'Failed to download "{modelId}"',
              values: { modelId },
            })
          );
        },
      });
  }

  public updateModelDeployment(
    modelId: string,
    deploymentId: string,
    config: AdaptiveAllocationsParams
  ) {
    from(this.trainedModelsApiService.updateModelDeployment(modelId, deploymentId, config))
      .pipe(
        finalize(() => {
          this.fetchModels();
        })
      )
      .subscribe({
        error: (error) => {
          this.displayErrorToast?.(
            error,
            i18n.translate('xpack.ml.trainedModels.modelsList.updateFailed', {
              defaultMessage: 'Failed to update "{deploymentId}"',
              values: { deploymentId },
            })
          );
        },
      });
  }

  public stopModelDeployment(
    modelId: string,
    deploymentIds: string[],
    options?: { force: boolean }
  ) {
    from(this.trainedModelsApiService.stopModelAllocation(modelId, deploymentIds, options))
      .pipe(
        finalize(() => {
          this.fetchModels();
        })
      )
      .subscribe({
        error: (error) => {
          this.displayErrorToast?.(
            error,
            i18n.translate('xpack.ml.trainedModels.modelsList.stopFailed', {
              defaultMessage: 'Failed to stop "{deploymentIds}"',
              values: { deploymentIds: deploymentIds.join(', ') },
            })
          );
        },
      });
  }

  public getModel(modelId: string): TrainedModelUIItem | undefined {
    return this.modelItems.find((item) => item.model_id === modelId);
  }

  public getModel$(modelId: string): Observable<TrainedModelUIItem | undefined> {
    return this._modelItems$.pipe(
      map((items) => items.find((item) => item.model_id === modelId)),
      distinctUntilChanged()
    );
  }

  public cleanupModelOperations(modelId: string) {
    this.markDownloadAborted(modelId);
    this.cancelDeployment$.next(modelId);
    this.setScheduledDeployments?.(
      this.activeDeployments.filter((deployment) => deployment.modelId !== modelId)
    );
  }

  private isModelReadyForDeployment(model: TrainedModelUIItem | undefined) {
    return (
      isBaseNLPModelItem(model) &&
      (model.state === MODEL_STATE.DOWNLOADED || model.state === MODEL_STATE.STARTED)
    );
  }

  private updateUiStateForDeployment(modelId: string) {
    const currentModels = this.modelItems;
    const updatedModels = currentModels.map((model) =>
      isBaseNLPModelItem(model) && model.model_id === modelId
        ? { ...model, state: MODEL_STATE.STARTING }
        : model
    );
    this._modelItems$.next(updatedModels);
  }

  private markDownloadAborted(modelId: string) {
    this.abortedDownloads.add(modelId);
  }

  private mergeModelItems(
    items: TrainedModelUIItem[],
    spaces: Record<string, string[]>
  ): TrainedModelUIItem[] {
    const existingItems = this.modelItems;

    return items.map((item) => {
      const prevItem = existingItems.find((i) => i.model_id === item.model_id);
      const baseItem = { ...item, spaces: spaces[item.model_id] };

      if (!prevItem || !isBaseNLPModelItem(prevItem) || !isBaseNLPModelItem(item)) return baseItem;

      if (prevItem.state === MODEL_STATE.DOWNLOADING) {
        return { ...baseItem, state: prevItem.state, downloadState: prevItem.downloadState };
      }

      if (
        prevItem.state === MODEL_STATE.STARTING &&
        (this.deploymentInProgress.has(item.model_id) ||
          this.activeDeployments.some((deployment) => deployment.modelId === item.model_id)) &&
        item.state !== MODEL_STATE.STARTED
      ) {
        return { ...baseItem, state: prevItem.state };
      }

      return baseItem;
    });
  }

  private setupFetchingSubscription() {
    const fetchTrigger$ = merge(
      this._reloadSubject$,
      this._scheduledDeployments$.pipe(
        pairwise(),
        filter(([prev, curr]) => {
          return prev.length !== curr.length;
        })
      )
    );

    this.subscription.add(
      fetchTrigger$
        .pipe(
          tap(() => this._isLoading$.next(true)),
          switchMap(() => {
            const modelsList$ = from(this.trainedModelsApiService.getTrainedModelsList()).pipe(
              catchError((error) => {
                this.displayErrorToast?.(
                  error,
                  i18n.translate('xpack.ml.trainedModels.modelsList.fetchFailedErrorMessage', {
                    defaultMessage: 'Error loading trained models',
                  })
                );
                return of([] as TrainedModelUIItem[]);
              })
            );

            const spaces$ = this.canManageSpacesAndSavedObjects
              ? from(this.savedObjectsApiService.trainedModelsSpaces()).pipe(
                  catchError(() => of({})),
                  map(
                    (spaces) =>
                      ('trainedModels' in spaces ? spaces.trainedModels : {}) as Record<
                        string,
                        string[]
                      >
                  )
                )
              : of({} as Record<string, string[]>);

            return combineLatest([modelsList$, spaces$]).pipe(
              finalize(() => this._isLoading$.next(false))
            );
          })
        )
        .subscribe(([items, spaces]) => {
          const updatedItems = this.mergeModelItems(items, spaces);
          this._modelItems$.next(updatedItems);
          this.startDownloadStatusPolling();
        })
    );
  }

  private setupDeploymentSubscription() {
    const deploymentSubscription = this._scheduledDeployments$
      .pipe(
        filter((deployments) => deployments.length > 0),
        withLatestFrom(this._modelItems$),
        switchMap(([deployments, modelItems]) => {
          // Create observables for each new deployment
          const deploymentObservables = deployments.map((deployment) => {
            if (this.deploymentInProgress.has(deployment.modelId)) {
              return EMPTY;
            }

            this.deploymentInProgress.add(deployment.modelId);

            const cancelation$ = this.cancelDeployment$.pipe(
              filter((canceledId) => canceledId === deployment.modelId),
              take(1)
            );

            const shouldMakeApiCall = modelItems.some(
              (model) =>
                isNLPModelItem(model) &&
                !model.deployment_ids.includes(deployment.deploymentParams.deployment_id!)
            );

            return this.getModel$(deployment.modelId).pipe(
              takeUntil(cancelation$),
              take(1),
              filter((model) => this.isModelReadyForDeployment(model)),
              filter(() => shouldMakeApiCall),
              tap(() => {
                this.updateUiStateForDeployment(deployment.modelId);
              }),
              switchMap(() => {
                return from(
                  this.trainedModelsApiService.startModelAllocation(
                    deployment.modelId,
                    deployment.deploymentParams,
                    deployment.adaptiveAllocationsParams
                  )
                ).pipe(
                  finalize(() => {
                    this.deploymentInProgress.delete(deployment.modelId);

                    const currentScheduledDeployments = this._scheduledDeployments$.getValue();

                    const updated = currentScheduledDeployments.filter(
                      (model) => model.modelId !== deployment.modelId
                    );

                    this.setScheduledDeployments?.(updated);
                  })
                );
              }),
              tap({
                next: () => {
                  this.displaySuccessToast?.({
                    title: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
                      defaultMessage: 'Deployment started',
                    }),
                    text: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccessText', {
                      defaultMessage: '"{deploymentId}" has started successfully.',
                      values: { deploymentId: deployment.deploymentParams.deployment_id },
                    }),
                  });
                },
                error: (error) => {
                  this.displayErrorToast?.(
                    error,
                    i18n.translate('xpack.ml.trainedModels.modelsList.startFailed', {
                      defaultMessage: 'Failed to start "{deploymentId}"',
                      values: { deploymentId: deployment.deploymentParams.deployment_id },
                    })
                  );
                  this.fetchModels();
                },
              }),
              takeUntil(cancelation$)
            );
          });

          // Merge all deployment observables
          return merge(...deploymentObservables);
        })
      )
      .subscribe();

    this.subscription.add(deploymentSubscription);
  }

  /**
   * The polling logic is the single source of truth for whether the model
   * is still in-progress downloading. If we see an item is no longer in the
   * returned statuses, that means it’s finished or aborted, so remove the
   * "downloading" operation in activeOperations (if present).
   */
  private startDownloadStatusPolling() {
    if (this.downloadStatusFetchInProgress) return;
    this.stopPolling();

    const downloadInProgress = new Set<string>();
    this.downloadStatusFetchInProgress = true;

    this.pollingSubscription = timer(0, DOWNLOAD_POLL_INTERVAL)
      .pipe(
        takeUntil(this.stopPolling$),
        switchMap(() => this.trainedModelsApiService.getModelsDownloadStatus()),
        distinctUntilChanged((prev, curr) => isEqual(prev, curr)),
        withLatestFrom(this._modelItems$)
      )
      .subscribe({
        next: ([downloadStatus, currentItems]) => {
          const updatedItems = currentItems.map((item) => {
            if (!isBaseNLPModelItem(item)) return item;

            /* Unfortunately, model download status does not report 100% download state, only from 1 to 99. Hence, there might be 3 cases
             * 1. Model is not downloaded at all
             * 2. Model download was in progress and finished
             * 3. Model download was in progress and aborted
             */
            if (downloadStatus[item.model_id]) {
              downloadInProgress.add(item.model_id);
              return {
                ...item,
                state: MODEL_STATE.DOWNLOADING,
                downloadState: downloadStatus[item.model_id],
              };
            } else {
              // Not in 'downloadStatus' => either done or aborted
              const newItem = { ...item };
              delete newItem.downloadState;

              if (this.abortedDownloads.has(item.model_id)) {
                // Aborted
                this.abortedDownloads.delete(item.model_id);
                newItem.state = MODEL_STATE.NOT_DOWNLOADED;
              } else if (downloadInProgress.has(item.model_id) || !item.state) {
                // Finished downloading
                newItem.state = MODEL_STATE.DOWNLOADED;
              }
              downloadInProgress.delete(item.model_id);
              return newItem;
            }
          });

          this._modelItems$.next(updatedItems);

          this.downloadStatus$.next(downloadStatus);

          Object.keys(downloadStatus).forEach((modelId) => {
            if (downloadStatus[modelId]) {
              downloadInProgress.add(modelId);
            }
          });

          if (Object.keys(downloadStatus).length === 0 && downloadInProgress.size === 0) {
            this.stopPolling();
            this.downloadStatusFetchInProgress = false;
          }
        },
        error: (error) => {
          this.stopPolling();
          this.downloadStatusFetchInProgress = false;
        },
      });
  }

  private stopPolling() {
    this.stopPolling$.next();
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    this.downloadStatusFetchInProgress = false;
  }

  private hasActiveOperations(): boolean {
    return (
      this.downloadInProgress.size > 0 ||
      this.deploymentInProgress.size > 0 ||
      this.downloadStatusFetchInProgress
    );
  }

  private cleanupService() {
    // Clear operation state
    this.downloadInProgress.clear();
    this.deploymentInProgress.clear();
    this.abortedDownloads.clear();
    this.downloadStatusFetchInProgress = false;

    // Clear subscriptions
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    // Reset behavior subjects to initial values
    this._modelItems$.next([]);
    this.downloadStatus$.next({});
    this._scheduledDeployments$.next([]);

    // Clear callbacks
    this.setScheduledDeployments = undefined;
    this.displayErrorToast = undefined;
    this.displaySuccessToast = undefined;

    // Reset initialization flag
    this.isInitialized = false;
  }

  public destroy() {
    // Cancel any pending destroy
    if (this.destroySubscription) {
      this.destroySubscription.unsubscribe();
      this.destroySubscription = undefined;
    }

    if (this.hasActiveOperations()) {
      this.destroySubscription = merge(
        timer(0, 1000).pipe(
          // Check if any operations are still in progress
          map(() => this.hasActiveOperations())
        )
      )
        .pipe(
          // Wait until all operations are complete
          filter((hasOperations) => !hasOperations),
          take(1),
          // Add a small delay to ensure all cleanup is complete
          delay(100)
        )
        .subscribe({
          complete: () => {
            this.cleanupService();
            this.destroySubscription = undefined;
          },
        });
    } else {
      this.cleanupService();
    }
  }
}

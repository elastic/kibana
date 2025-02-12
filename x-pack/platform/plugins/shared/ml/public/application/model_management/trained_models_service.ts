/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import {
  Subscription,
  of,
  from,
  forkJoin,
  takeWhile,
  exhaustMap,
  firstValueFrom,
  BehaviorSubject,
  Subject,
  timer,
  switchMap,
  distinctUntilChanged,
  map,
  tap,
  take,
  finalize,
  withLatestFrom,
  filter,
  catchError,
  debounceTime,
  merge,
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
  StartAllocationParams,
} from '../services/ml_api_service/trained_models';
import { type TrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type { SavedObjectsApiService } from '../services/ml_api_service/saved_objects';

interface ModelDownloadStatus {
  [modelId: string]: ModelDownloadState;
}

const DOWNLOAD_POLL_INTERVAL = 3000;

interface TrainedModelsServiceInit {
  scheduledDeployments$: BehaviorSubject<StartAllocationParams[]>;
  setScheduledDeployments: (deployments: StartAllocationParams[]) => void;
  displayErrorToast: (error: ErrorType, title?: string) => void;
  displaySuccessToast: (toast: { title: string; text: string }) => void;
  savedObjectsApiService: SavedObjectsApiService;
  canManageSpacesAndSavedObjects: boolean;
}

export class TrainedModelsService {
  private readonly _reloadSubject$ = new Subject();

  private readonly _modelItems$ = new BehaviorSubject<TrainedModelUIItem[]>([]);
  private readonly downloadStatus$ = new BehaviorSubject<ModelDownloadStatus>({});
  private readonly downloadInProgress = new Set<string>();
  private pollingSubscription?: Subscription;
  private abortedDownloads = new Set<string>();
  private downloadStatusFetchInProgress = false;
  private setScheduledDeployments?: (deployingModels: StartAllocationParams[]) => void;
  private displayErrorToast?: (error: ErrorType, title?: string) => void;
  private displaySuccessToast?: (toast: { title: string; text: string }) => void;
  private subscription!: Subscription;
  private _scheduledDeployments$ = new BehaviorSubject<StartAllocationParams[]>([]);
  private destroySubscription?: Subscription;
  private readonly _isLoading$ = new BehaviorSubject<boolean>(true);
  private savedObjectsApiService!: SavedObjectsApiService;
  private canManageSpacesAndSavedObjects!: boolean;
  private isInitialized = false;

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
    distinctUntilChanged(isEqual)
  );

  public get scheduledDeployments$(): Observable<StartAllocationParams[]> {
    return this._scheduledDeployments$;
  }

  public get scheduledDeployments(): StartAllocationParams[] {
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
        next: () => {
          this.displaySuccessToast?.({
            title: i18n.translate('xpack.ml.trainedModels.modelsList.updateSuccess', {
              defaultMessage: 'Deployment updated',
            }),
            text: i18n.translate('xpack.ml.trainedModels.modelsList.updateSuccessText', {
              defaultMessage: '"{deploymentId}" has been updated successfully.',
              values: { deploymentId },
            }),
          });
        },
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
      distinctUntilChanged(isEqual)
    );
  }

  /** Removes scheduled deployments for a model */
  public removeScheduledDeployments({
    modelId,
    deploymentId,
  }: {
    modelId?: string;
    deploymentId?: string;
  }) {
    let updated = this._scheduledDeployments$.getValue();

    // If removing by modelId, abort download and filter all deployments for that model.
    if (modelId) {
      this.abortDownload(modelId);
      updated = updated.filter((d) => d.modelId !== modelId);
    }

    // If removing by deploymentId, filter deployments matching that ID.
    if (deploymentId) {
      updated = updated.filter((d) => d.deploymentParams.deployment_id !== deploymentId);
    }

    this.setScheduledDeployments?.(updated);
  }

  private isModelReadyForDeployment(model: TrainedModelUIItem | undefined) {
    if (!model || !isBaseNLPModelItem(model)) {
      return false;
    }
    return model.state === MODEL_STATE.DOWNLOADED || model.state === MODEL_STATE.STARTED;
  }

  private setDeployingStateForModel(modelId: string) {
    const currentModels = this.modelItems;
    const updatedModels = currentModels.map((model) =>
      isBaseNLPModelItem(model) && model.model_id === modelId
        ? { ...model, state: MODEL_STATE.STARTING }
        : model
    );
    this._modelItems$.next(updatedModels);
  }

  private abortDownload(modelId: string) {
    this.abortedDownloads.add(modelId);
  }

  private mergeModelItems(
    items: TrainedModelUIItem[],
    spaces: Record<string, string[]>
  ): TrainedModelUIItem[] {
    const existingItems = this._modelItems$.getValue();

    return items.map((item) => {
      const previous = existingItems.find((m) => m.model_id === item.model_id);
      const merged = {
        ...item,
        spaces: spaces[item.model_id] ?? [],
      };

      if (!previous || !isBaseNLPModelItem(previous) || !isBaseNLPModelItem(item)) {
        return merged;
      }

      // Preserve "DOWNLOADING" state and the accompanying progress if still in progress
      if (previous.state === MODEL_STATE.DOWNLOADING) {
        return {
          ...merged,
          state: previous.state,
          downloadState: previous.downloadState,
        };
      }

      // If was "STARTING" and there's still a scheduled deployment, keep it in "STARTING"
      if (
        previous.state === MODEL_STATE.STARTING &&
        this.scheduledDeployments.some((d) => d.modelId === item.model_id) &&
        item.state !== MODEL_STATE.STARTED
      ) {
        return {
          ...merged,
          state: previous.state,
        };
      }

      return merged;
    });
  }

  private setupFetchingSubscription() {
    this.subscription.add(
      this._reloadSubject$
        .pipe(
          tap(() => this._isLoading$.next(true)),
          debounceTime(100),
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

            return forkJoin([modelsList$, spaces$]).pipe(
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
    this.subscription.add(
      this._scheduledDeployments$
        .pipe(
          filter((deployments) => deployments.length > 0),
          tap(() => this.fetchModels()),
          switchMap((deployments) =>
            this._isLoading$.pipe(
              filter((isLoading) => !isLoading),
              take(1),
              map(() => deployments)
            )
          ),
          // Check if the model is already deployed and remove it from the scheduled deployments if so
          switchMap((deployments) => {
            const filteredDeployments = deployments.filter((deployment) => {
              const model = this.modelItems.find((m) => m.model_id === deployment.modelId);
              return !(model && this.isModelAlreadyDeployed(model, deployment));
            });

            return of(filteredDeployments).pipe(
              tap((filtered) => {
                if (!isEqual(deployments, filtered)) {
                  this.setScheduledDeployments?.(filtered);
                }
              }),
              filter((filtered) => isEqual(deployments, filtered)) // Only proceed if no changes were made
            );
          }),
          switchMap((deployments) =>
            merge(...deployments.map((deployment) => this.handleDeployment$(deployment)))
          )
        )
        .subscribe()
    );
  }

  private handleDeployment$(deployment: StartAllocationParams) {
    return of(deployment).pipe(
      // Wait for the model to be ready for deployment (downloaded or started)
      switchMap(() => {
        return this.waitForModelReady(deployment.modelId);
      }),
      tap(() => this.setDeployingStateForModel(deployment.modelId)),
      exhaustMap(() => {
        return firstValueFrom(
          this.trainedModelsApiService.startModelAllocation(deployment).pipe(
            tap({
              next: () => {
                this.displaySuccessToast?.({
                  title: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
                    defaultMessage: 'Deployment started',
                  }),
                  text: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccessText', {
                    defaultMessage: '"{deploymentId}" has started successfully.',
                    values: {
                      deploymentId: deployment.deploymentParams.deployment_id,
                    },
                  }),
                });
              },
              error: (error) => {
                this.displayErrorToast?.(
                  error,
                  i18n.translate('xpack.ml.trainedModels.modelsList.startFailed', {
                    defaultMessage: 'Failed to start "{deploymentId}"',
                    values: {
                      deploymentId: deployment.deploymentParams.deployment_id,
                    },
                  })
                );
              },
              finalize: () => {
                this.removeScheduledDeployments({
                  deploymentId: deployment.deploymentParams.deployment_id!,
                });
                // Manually update the BehaviorSubject to ensure proper cleanup
                // if user navigates away, as localStorage hook won't be available to handle updates
                const updatedDeployments = this._scheduledDeployments$
                  .getValue()
                  .filter((d) => d.modelId !== deployment.modelId);
                this._scheduledDeployments$.next(updatedDeployments);
                this.fetchModels();
              },
            })
          )
        );
      })
    );
  }

  private isModelAlreadyDeployed(model: TrainedModelUIItem, deployment: StartAllocationParams) {
    return !!(
      model &&
      isNLPModelItem(model) &&
      (model.deployment_ids.includes(deployment.deploymentParams.deployment_id!) ||
        model.state === MODEL_STATE.STARTING)
    );
  }

  private waitForModelReady(modelId: string): Observable<TrainedModelUIItem> {
    return this.getModel$(modelId).pipe(
      filter((model): model is TrainedModelUIItem => this.isModelReadyForDeployment(model)),
      take(1)
    );
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
        takeWhile(() => this.downloadStatusFetchInProgress),
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
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    this.downloadStatusFetchInProgress = false;
  }

  private cleanupService() {
    // Clear operation state
    this.downloadInProgress.clear();
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

    // Wait for scheduled deployments to be empty before cleaning up
    this.destroySubscription = this._scheduledDeployments$
      .pipe(
        filter((deployments) => deployments.length === 0),
        take(1)
      )
      .subscribe({
        complete: () => {
          this.cleanupService();
          this.destroySubscription = undefined;
        },
      });
  }
}

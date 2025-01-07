/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription, Observable } from 'rxjs';
import {
  BehaviorSubject,
  Subject,
  timer,
  switchMap,
  takeUntil,
  distinctUntilChanged,
  map,
} from 'rxjs';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import { isEqual } from 'lodash';
import {
  isBaseNLPModelItem,
  type ModelDownloadState,
  type TrainedModelUIItem,
} from '../../../common/types/trained_models';
import type {
  CommonDeploymentParams,
  AdaptiveAllocationsParams,
} from '../services/ml_api_service/trained_models';
import {
  useTrainedModelsApiService,
  type TrainedModelsApiService,
} from '../services/ml_api_service/trained_models';

interface ModelDownloadStatus {
  [modelId: string]: ModelDownloadState;
}

interface ModelState {
  items: TrainedModelUIItem[];
  isLoading: boolean;
}

interface ModelOperation {
  modelId: string;
  type: 'downloading' | 'deploying';
}

const DOWNLOAD_POLL_INTERVAL = 3000;

export class TrainedModelsService {
  private modelState$ = new BehaviorSubject<ModelState>({ items: [], isLoading: false });
  private downloadStatus$ = new BehaviorSubject<ModelDownloadStatus>({});
  private stopPolling$ = new Subject<void>();
  private pollingSubscription?: Subscription;
  private abortedDownloads = new Set<string>();
  private initialized = false;
  private onFetchCallbacks: Array<(items: TrainedModelUIItem[]) => void> = [];
  private downloadStatusFetchInProgress = false;
  private _activeOperations$ = new BehaviorSubject<ModelOperation[]>([]);

  constructor(private readonly trainedModelsApiService: TrainedModelsApiService) {}

  public readonly models$ = this.modelState$.pipe(
    map((state) => state.items),
    distinctUntilChanged()
  );

  public readonly isLoading$ = this.modelState$.pipe(
    map((state) => state.isLoading),
    distinctUntilChanged()
  );

  public readonly activeOperations$ = this._activeOperations$.pipe(
    distinctUntilChanged((prev, curr) => isEqual(prev, curr))
  );

  public get activeOperations(): ModelOperation[] {
    return this._activeOperations$.getValue();
  }

  public get models(): TrainedModelUIItem[] {
    return this.modelState$.getValue().items;
  }

  public get isLoading(): boolean {
    return this.modelState$.getValue().isLoading;
  }

  public isInitialized() {
    return this.initialized;
  }

  public onFetch(callback: (items: TrainedModelUIItem[]) => void) {
    this.onFetchCallbacks.push(callback);
    return () => {
      this.onFetchCallbacks = this.onFetchCallbacks.filter((c) => c !== callback);
    };
  }

  public async fetchModels(): Promise<void> {
    if (!this.isInitialized()) {
      this.initialized = true;
    }

    this.setLoading(true);

    try {
      const resultItems = await this.trainedModelsApiService.getTrainedModelsList();
      // Merge extisting items with new items
      // to preserve state and download status
      const updatedItems = this.mergeModelItems(resultItems);

      this.modelState$.next({ items: updatedItems, isLoading: false });

      this.onFetchCallbacks.forEach((callback) => callback(updatedItems));

      this.startDownloadStatusPolling();
    } catch (error) {
      // Rethrow to be handled by the caller
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public async downloadModel(modelId: string) {
    this.setLoading(true);

    this.addActiveOperation({
      modelId,
      type: 'downloading',
    });

    try {
      await this.trainedModelsApiService.installElasticTrainedModelConfig(modelId);
    } catch (error) {
      this.removeActiveOperation(modelId, 'downloading');
      this.setLoading(false);
      throw error;
    }

    await this.fetchModels();
    this.setLoading(false);
  }

  public async startModelDeployment(
    modelId: string,
    deploymentParams: CommonDeploymentParams,
    adaptiveAllocationsParams?: AdaptiveAllocationsParams
  ) {
    this.setLoading(true);

    try {
      await this.ensureModelIsDownloaded(modelId);

      this.addActiveOperation({ modelId, type: 'deploying' });

      await this.trainedModelsApiService.startModelAllocation(
        modelId,
        deploymentParams,
        adaptiveAllocationsParams
      );

      await this.fetchModels();
    } catch (error) {
      // Rethrow to be handled by the caller
      throw error;
    } finally {
      this.removeActiveOperation(modelId, 'deploying');
      this.setLoading(false);
    }
  }

  public async updateModelDeployment(
    modelId: string,
    deploymentId: string,
    config: AdaptiveAllocationsParams
  ) {
    this.setLoading(true);
    try {
      await this.trainedModelsApiService.updateModelDeployment(modelId, deploymentId, config);
      await this.fetchModels();
    } catch (error) {
      // Rethrow to be handled by the caller
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public async stopModelDeployment(
    modelId: string,
    deploymentIds: string[],
    options: { force?: boolean } = {}
  ) {
    this.setLoading(true);
    try {
      const results = await this.trainedModelsApiService.stopModelAllocation(
        modelId,
        deploymentIds,
        { force: options.force ?? false }
      );
      await this.fetchModels();
      return results;
    } catch (error) {
      // Rethrow to be handled by the caller
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public getModel(modelId: string): TrainedModelUIItem | undefined {
    return this.modelState$.getValue().items.find((item) => item.model_id === modelId);
  }

  public markDownloadAborted(modelId: string) {
    this.abortedDownloads.add(modelId);
  }

  public getModelDownloadState$(modelId: string): Observable<ModelDownloadState | undefined> {
    return this.downloadStatus$.pipe(
      map((status) => status[modelId]),
      distinctUntilChanged()
    );
  }

  public getModelDownloadState(modelId: string): ModelDownloadState | undefined {
    return this.downloadStatus$.getValue()[modelId];
  }

  private async ensureModelIsDownloaded(modelId: string) {
    const model = this.getModel(modelId);

    if (!isBaseNLPModelItem(model)) return;

    if (model?.state === MODEL_STATE.DOWNLOADED) {
      return;
    }

    const isNotDownloaded = model.state === MODEL_STATE.NOT_DOWNLOADED;
    const alreadyDownloading = this.activeOperations.some(
      (op) => op.modelId === modelId && op.type === 'downloading'
    );

    // If there's no "downloading" operation yet and the model is not downloaded, start downloading
    if (isNotDownloaded && !alreadyDownloading) {
      await this.downloadModel(modelId);
    }

    // Wait until the poll sets the model as fully downloaded
    await new Promise<void>((resolve) => {
      const subscription = this.getModel$(modelId).subscribe((updatedModel) => {
        if (!isBaseNLPModelItem(updatedModel)) return;

        if (updatedModel?.state === MODEL_STATE.DOWNLOADED) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  private mergeModelItems(newItems: TrainedModelUIItem[]) {
    const existingItems = this.modelState$.getValue().items;

    return newItems.map((item) => {
      const prevItem = existingItems.find((i) => i.model_id === item.model_id);

      if (!prevItem) return item;

      if (isBaseNLPModelItem(prevItem) && prevItem.state === MODEL_STATE.DOWNLOADING) {
        return { ...item, state: prevItem.state, downloadState: prevItem.downloadState };
      }

      return item;
    });
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
        distinctUntilChanged((prev, curr) => isEqual(prev, curr))
      )
      .subscribe({
        next: (downloadStatus) => {
          const currentItems = this.modelState$.getValue().items;
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
                this.removeActiveOperation(item.model_id, 'downloading');
              } else if (downloadInProgress.has(item.model_id) || !item.state) {
                // Finished downloading
                newItem.state = MODEL_STATE.DOWNLOADED;
                this.removeActiveOperation(item.model_id, 'downloading');
              }
              downloadInProgress.delete(item.model_id);
              return newItem;
            }
          });

          this.modelState$.next({
            ...this.modelState$.getValue(),
            items: updatedItems,
          });

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

  public getModel$(modelId: string): Observable<TrainedModelUIItem | undefined> {
    return this.modelState$.pipe(
      map((state) => state.items.find((item) => item.model_id === modelId)),
      distinctUntilChanged()
    );
  }

  private setLoading(isLoading: boolean): void {
    this.modelState$.next({ ...this.modelState$.getValue(), isLoading });
  }

  private addActiveOperation(operation: ModelOperation) {
    const currentOperations = this._activeOperations$.getValue();
    this._activeOperations$.next([...currentOperations, operation]);
  }

  private removeActiveOperation(modelId: string, operationType: ModelOperation['type']) {
    const currentOperations = this._activeOperations$.getValue();
    this._activeOperations$.next(
      currentOperations.filter((op) => op.modelId !== modelId && op.type !== operationType)
    );
  }

  public destroy() {
    this.stopPolling();
    this.modelState$.complete();
    this.downloadStatus$.complete();
    this.stopPolling$.complete();
    this.pollingSubscription?.unsubscribe();
  }
}

// Retain singleton instance of TrainedModelsService
let trainedModelsService: TrainedModelsService | null = null;
export const TrainedModelsServiceFactory = (trainedModelsApiService: TrainedModelsApiService) => {
  if (!trainedModelsService) {
    trainedModelsService = new TrainedModelsService(trainedModelsApiService);
  }
  return trainedModelsService;
};

export const useTrainedModelsService = () => {
  const trainedModelsApiService = useTrainedModelsApiService();

  if (!trainedModelsService) {
    trainedModelsService = TrainedModelsServiceFactory(trainedModelsApiService);
  }

  return trainedModelsService;
};

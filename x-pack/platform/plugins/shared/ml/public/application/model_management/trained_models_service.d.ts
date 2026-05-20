import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { ErrorType } from '@kbn/ml-error-utils';
import { type TrainedModelUIItem, type DeleteModelParams } from '@kbn/ml-common-types/trained_models';
import { type TrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type { ITelemetryClient } from '../services/telemetry/types';
import type { DeploymentParamsUI } from './deployment_setup';
import type { DeploymentParamsMapper } from './deployment_params_mapper';
interface TrainedModelsServiceInit {
    scheduledDeployments$: BehaviorSubject<ScheduledDeployment[]>;
    setScheduledDeployments: (deployments: ScheduledDeployment[]) => void;
    displayErrorToast: (error: ErrorType, title?: string) => void;
    displaySuccessToast: (toast: {
        title: string;
        text: string;
    }) => void;
    telemetryService: ITelemetryClient;
    deploymentParamsMapper: DeploymentParamsMapper;
}
export interface ScheduledDeployment extends DeploymentParamsUI {
    modelId: string;
}
export declare class TrainedModelsService {
    private readonly trainedModelsApiService;
    private readonly _reloadSubject$;
    private readonly _modelItems$;
    private readonly downloadStatus$;
    private pollingSubscription?;
    private abortedDownloads;
    private downloadStatusFetchInProgress;
    private setScheduledDeployments?;
    private displayErrorToast?;
    private displaySuccessToast?;
    private subscription;
    private _scheduledDeployments$;
    private destroySubscription?;
    private readonly _isLoading$;
    private isInitialized;
    private telemetryService;
    private deploymentParamsMapper;
    private uiInitiatedDownloads;
    constructor(trainedModelsApiService: TrainedModelsApiService);
    init({ scheduledDeployments$, setScheduledDeployments, displayErrorToast, displaySuccessToast, telemetryService, deploymentParamsMapper, }: TrainedModelsServiceInit): void;
    readonly isLoading$: Observable<boolean>;
    readonly modelItems$: Observable<TrainedModelUIItem[]>;
    get scheduledDeployments$(): Observable<ScheduledDeployment[]>;
    get scheduledDeployments(): ScheduledDeployment[];
    get modelItems(): TrainedModelUIItem[];
    get isLoading(): boolean;
    fetchModels(): void;
    startModelDeployment(modelId: string, deploymentParams: DeploymentParamsUI): void;
    downloadModel(modelId: string): void;
    updateModelDeployment(modelId: string, config: DeploymentParamsUI): void;
    deleteModels(modelIds: string[], options: DeleteModelParams['options']): Promise<void>;
    stopModelDeployment(modelId: string, deploymentIds: string[], options?: {
        force: boolean;
    }): void;
    getModel(modelId: string): TrainedModelUIItem | undefined;
    getModel$(modelId: string): Observable<TrainedModelUIItem | undefined>;
    /** Removes scheduled deployments for a model */
    removeScheduledDeployments({ modelId, deploymentId, }: {
        modelId?: string;
        deploymentId?: string;
    }): void;
    private isModelReadyForDeployment;
    private setDeployingStateForModel;
    private abortDownload;
    private mergeModelItems;
    private setupFetchingSubscription;
    private setupDeploymentSubscription;
    private handleDeployment$;
    private getUpdateModelAllocationParams;
    private isModelAlreadyDeployed;
    private waitForModelReady;
    /**
     * The polling logic is the single source of truth for whether the model
     * is still in-progress downloading. If we see an item is no longer in the
     * returned statuses, that means it’s finished or aborted, so remove the
     * "downloading" operation in activeOperations (if present).
     */
    private startDownloadStatusPolling;
    private stopPolling;
    private cleanupService;
    destroy(): void;
}
export {};

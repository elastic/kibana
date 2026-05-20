import type { FC } from 'react';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import { type TrainedModelDeploymentStatsResponse } from '@kbn/ml-common-types/trained_models';
import type { CloudInfo } from '@kbn/ml-common-types/ml_server_info';
import type { NLPSettings } from '../../../common/constants/app';
import { DeploymentParamsMapper } from './deployment_params_mapper';
import type { HttpService } from '../services/http_service';
import type { TrainedModelsService } from './trained_models_service';
import type { MlCapabilitiesService } from '../capabilities/check_capabilities';
interface DeploymentSetupProps {
    config: DeploymentParamsUI;
    onConfigChange: (config: DeploymentParamsUI) => void;
    errors: Partial<Record<keyof DeploymentParamsUI | 'min_number_of_allocations' | 'max_number_of_allocations', Record<string, unknown>>>;
    isUpdate?: boolean;
    deploymentsParams?: Record<string, DeploymentParamsUI>;
    cloudInfo: CloudInfo;
    showNodeInfo: boolean;
    disableAdaptiveResourcesControl?: boolean;
    deploymentParamsMapper: DeploymentParamsMapper;
    /** When true, hides ingest/search optimization (always search-optimized) and shows rerank warnings */
    isSearchOnly?: boolean;
}
/**
 * Interface for deployment params in the UI.
 */
export interface DeploymentParamsUI {
    /**
     * Deployment ID
     */
    deploymentId?: string;
    /**
     * Indicates the use case deployment is optimized for.
     * For ingest, use 1 thread
     * For search, use N threads, where N = no. of physical cores of an ML node
     */
    optimized: 'optimizedForIngest' | 'optimizedForSearch';
    /**
     * Adaptive resources
     */
    adaptiveResources: boolean;
    /**
     * Level of vCPU usage.
     * When adaptive resources are enabled, corresponds to the min-max range.
     * When adaptive resources are disabled (and for on-prem deployments), set to a static number of allocations.
     */
    vCPUUsage: 'low' | 'medium' | 'high';
}
export declare const RERANK_WARNING_DESCRIPTION: string;
export declare const RERANK_WARNING_SERVERLESS_DESCRIPTION: string;
/**
 * Form for setting threading params.
 */
export declare const DeploymentSetup: FC<DeploymentSetupProps>;
interface StartDeploymentModalProps {
    modelId: string;
    startModelDeploymentDocUrl: string;
    onConfigChange: (config: DeploymentParamsUI) => void;
    onClose: () => void;
    initialParams?: DeploymentParamsUI;
    modelAndDeploymentIds?: string[];
    cloudInfo: CloudInfo;
    deploymentParamsMapper: DeploymentParamsMapper;
    showNodeInfo: boolean;
    nlpSettings: NLPSettings;
}
/**
 * Modal window wrapper for {@link DeploymentSetup}
 */
export declare const StartUpdateDeploymentModal: FC<StartDeploymentModalProps>;
/**
 * Returns a callback for requesting user's input for threading params
 * with a form rendered in a modal window.
 *
 * @param overlays
 * @param theme$
 */
export declare const getUserInputModelDeploymentParamsProvider: (overlays: OverlayStart, startServices: Pick<CoreStart, "analytics" | "i18n" | "theme" | "userProfile">, startModelDeploymentDocUrl: string, cloudInfo: CloudInfo, showNodeInfo: boolean, nlpSettings: NLPSettings, httpService: HttpService, trainedModelsService: TrainedModelsService, mlCapabilities: MlCapabilitiesService) => (modelId: string, initialParams?: TrainedModelDeploymentStatsResponse, deploymentIds?: string[]) => Promise<DeploymentParamsUI | void>;
export {};

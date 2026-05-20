import type { MlStartTrainedModelDeploymentRequest } from '@elastic/elasticsearch/lib/api/types';
import type { TrainedModelDeploymentStatsResponse, StartAllocationParams } from '@kbn/ml-common-types/trained_models';
import type { CloudInfo, MlServerLimits } from '@kbn/ml-common-types/ml_server_info';
import type { NLPSettings } from '../../../common/constants/app';
import type { AdaptiveAllocations } from '../../../server/lib/ml_client/types';
import type { DeploymentParamsUI } from './deployment_setup';
export type MlStartTrainedModelDeploymentRequestNew = MlStartTrainedModelDeploymentRequest & AdaptiveAllocations;
type VCPUBreakpoints = Record<DeploymentParamsUI['vCPUUsage'], {
    min: number;
    max: number;
    /**
     * Static value is used for the number of vCPUs when the adaptive resources are disabled.
     * Not allowed in certain environments, Obs and Security serverless projects.
     */
    static?: number;
    maxThreads?: number;
}>;
type BreakpointValues = VCPUBreakpoints[keyof VCPUBreakpoints];
/**
 * Class responsible for mapping deployment params between API and UI
 */
export declare class DeploymentParamsMapper {
    private readonly mlServerLimits;
    private readonly cloudInfo;
    private readonly nlpSettings?;
    private readonly threadingParamsValues;
    /**
     * vCPUs level breakpoints for cloud cluster with enabled ML autoscaling.
     * TODO resolve dynamically when Control Pane exposes the vCPUs range.
     */
    private readonly autoscalingVCPUBreakpoints;
    /**
     * vCPUs level breakpoints based on the ML server limits.
     * Either on-prem or cloud with disabled ML autoscaling.
     */
    private readonly hardwareVCPUBreakpoints;
    /**
     * Result vCPUs level breakpoint based on the cluster env.
     */
    private readonly vCpuBreakpoints;
    /**
     * Gets the min allowed number of allocations.
     * - 0 for serverless and ESS with enabled autoscaling.
     * - 1 otherwise
     * @internal
     */
    private get minAllowedNumberOfAllocation();
    constructor(mlServerLimits: MlServerLimits, cloudInfo: CloudInfo, nlpSettings?: NLPSettings | undefined);
    private getNumberOfThreads;
    /**
     * Returns allocation values accounting for the number of threads per allocation.
     * @param params
     * @internal
     */
    private getAllocationsParams;
    /**
     * Gets vCPU (virtual CPU) range based on the vCPU usage level
     * @param vCPUUsage
     * @returns
     */
    getVCPURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']): {
        min: number;
        max: number;
        /**
         * Static value is used for the number of vCPUs when the adaptive resources are disabled.
         * Not allowed in certain environments, Obs and Security serverless projects.
         */
        static?: number;
        maxThreads?: number;
    };
    /**
     * Gets VCU (Virtual Compute Units) range based on the vCPU usage level
     * @param vCPUUsage
     * @returns
     */
    getVCURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']): BreakpointValues;
    /**
     * Maps UI params to the actual start deployment API request
     * @param input
     */
    mapUiToApiDeploymentParams(modelId: string, input: DeploymentParamsUI): StartAllocationParams;
    /**
     * Maps deployment params from API to the UI
     * @param input
     */
    mapApiToUiDeploymentParams(input: MlTrainedModelAssignmentTaskParametersAdaptive): DeploymentParamsUI;
}
export type MlTrainedModelAssignmentTaskParametersAdaptive = TrainedModelDeploymentStatsResponse & AdaptiveAllocations;
export {};

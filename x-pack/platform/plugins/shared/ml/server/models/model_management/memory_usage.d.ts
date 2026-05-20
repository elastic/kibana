import type { estypes } from '@elastic/elasticsearch';
import type { MemoryUsageInfo } from '@kbn/ml-common-types/trained_models';
import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
import type { NodesOverviewResponse } from '@kbn/ml-common-types/trained_models';
import type { MlClient } from '../../lib/ml_client';
import type { MlFeatures } from '../../../common/constants/app';
declare const NODE_FIELDS: readonly ["attributes", "name", "roles"];
export type RequiredNodeFields = Pick<estypes.NodesInfoNodeInfo, (typeof NODE_FIELDS)[number]>;
export declare class MemoryUsageService {
    private readonly mlClient;
    private readonly mlFeatures;
    constructor(mlClient: MlClient, mlFeatures: MlFeatures);
    getMemorySizes(itemType?: MlSavedObjectType, node?: string, showClosedJobs?: boolean): Promise<MemoryUsageInfo[]>;
    private getADJobsSizes;
    private getTrainedModelsSizes;
    private getDFAJobsSizes;
    private getADJobMemorySize;
    private getDFAJobMemorySize;
    private getTrainedModelMemorySize;
    /**
     * Provides the ML nodes overview with allocated models.
     */
    getNodesOverview(): Promise<NodesOverviewResponse>;
}
export {};

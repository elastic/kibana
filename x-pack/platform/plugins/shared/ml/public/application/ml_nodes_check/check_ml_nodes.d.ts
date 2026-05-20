import type { MlNodeCount } from '@kbn/ml-common-types/ml_server_info';
import type { MlApi } from '../services/ml_api_service';
export declare function getMlNodeCount(mlApi: MlApi): Promise<MlNodeCount>;
export declare function mlNodesAvailable(): boolean;
export declare function currentMlNodesAvailable(): boolean;
export declare function lazyMlNodesAvailable(): boolean;
export declare function permissionToViewMlNodeCount(): boolean;
export declare function getMlNodesCount(): number;

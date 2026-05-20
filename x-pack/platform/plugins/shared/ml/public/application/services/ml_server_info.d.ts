import type { CloudInfo, MlServerDefaults, MlServerLimits } from '@kbn/ml-common-types/ml_server_info';
import type { MlApi } from './ml_api_service';
export declare function loadMlServerInfo(mlApi: MlApi): Promise<{
    defaults: MlServerDefaults;
    limits: MlServerLimits;
    cloudId: CloudInfo;
}>;
export declare function getNewJobDefaults(): MlServerDefaults;
export declare function getNewJobLimits(): MlServerLimits;
export declare function getCloudId(): string | null;
export declare function isCloud(): boolean;
export declare function isCloudTrial(): boolean;
export declare function getCloudDeploymentId(): string | null;
export declare function extractDeploymentId(cloudId: string): string | null;

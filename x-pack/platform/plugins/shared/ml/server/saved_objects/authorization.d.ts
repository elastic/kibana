import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
export declare function authorizationProvider(authorization: SecurityPluginSetup['authz']): {
    authorizationCheck: (request: KibanaRequest) => Promise<{
        canCreateJobsGlobally: boolean;
        canCreateJobsAtSpace: boolean;
        canCreateTrainedModelsGlobally: boolean;
        canCreateTrainedModelsAtSpace: boolean;
    }>;
};

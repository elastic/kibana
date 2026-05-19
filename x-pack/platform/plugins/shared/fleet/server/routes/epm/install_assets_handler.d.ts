import type { KibanaRequest } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { DeleteKibanaAssetsRequestSchema, FleetRequestHandler, InstallKibanaAssetsRequestSchema, InstallRuleAssetsRequestSchema } from '../../types';
export declare function checkIntegrationsAllPrivilegesForSpaces(request: KibanaRequest, spaceIds: string[]): Promise<void>;
export declare const installPackageKibanaAssetsHandler: FleetRequestHandler<TypeOf<typeof InstallKibanaAssetsRequestSchema.params>, undefined, TypeOf<typeof InstallKibanaAssetsRequestSchema.body>>;
export declare const deletePackageKibanaAssetsHandler: FleetRequestHandler<TypeOf<typeof DeleteKibanaAssetsRequestSchema.params>, undefined>;
export declare const installRuleAssetsHandler: FleetRequestHandler<TypeOf<typeof InstallRuleAssetsRequestSchema.params>, undefined, TypeOf<typeof InstallRuleAssetsRequestSchema.body>>;

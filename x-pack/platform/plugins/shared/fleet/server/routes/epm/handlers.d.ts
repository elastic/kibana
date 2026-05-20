import type { TypeOf } from '@kbn/config-schema';
import type { GetCategoriesRequestSchema, GetPackagesRequestSchema, GetInstalledPackagesRequestSchema, GetDataStreamsRequestSchema, GetInfoRequestSchema, GetInfoWithoutVersionRequestSchema, InstallPackageFromRegistryRequestSchema, InstallPackageFromRegistryWithoutVersionRequestSchema, InstallPackageByUploadRequestSchema, DeletePackageRequestSchema, DeletePackageWithoutVersionRequestSchema, BulkInstallPackagesFromRegistryRequestSchema, GetStatsRequestSchema, GetDependenciesRequestSchema, FleetRequestHandler, UpdatePackageRequestSchema, UpdatePackageWithoutVersionRequestSchema, GetLimitedPackagesRequestSchema, GetBulkAssetsRequestSchema, CreateCustomIntegrationRequestSchema, GetInputsRequestSchema, CustomIntegrationRequestSchema, RollbackPackageRequestSchema, GetKnowledgeBaseRequestSchema, ReviewUpgradeRequestSchema } from '../../types';
import type { ReauthorizeTransformRequestSchema } from '../../types';
export declare const getCategoriesHandler: FleetRequestHandler<undefined, TypeOf<typeof GetCategoriesRequestSchema.query>>;
export declare const getListHandler: FleetRequestHandler<undefined, TypeOf<typeof GetPackagesRequestSchema.query>>;
export declare const getInstalledListHandler: FleetRequestHandler<undefined, TypeOf<typeof GetInstalledPackagesRequestSchema.query>>;
export declare const getDataStreamsHandler: FleetRequestHandler<undefined, TypeOf<typeof GetDataStreamsRequestSchema.query>>;
export declare const getLimitedListHandler: FleetRequestHandler<undefined, TypeOf<typeof GetLimitedPackagesRequestSchema.query>, undefined>;
export declare const getInfoHandler: FleetRequestHandler<TypeOf<typeof GetInfoRequestSchema.params> | TypeOf<typeof GetInfoWithoutVersionRequestSchema.params>, TypeOf<typeof GetInfoRequestSchema.query>>;
export declare const getBulkAssetsHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof GetBulkAssetsRequestSchema.body>>;
export declare const updatePackageHandler: FleetRequestHandler<TypeOf<typeof UpdatePackageRequestSchema.params> | TypeOf<typeof UpdatePackageWithoutVersionRequestSchema.params>, unknown, TypeOf<typeof UpdatePackageRequestSchema.body>>;
export declare const reviewUpgradeHandler: FleetRequestHandler<TypeOf<typeof ReviewUpgradeRequestSchema.params>, unknown, TypeOf<typeof ReviewUpgradeRequestSchema.body>>;
export declare const getStatsHandler: FleetRequestHandler<TypeOf<typeof GetStatsRequestSchema.params>>;
export declare const getDependenciesHandler: FleetRequestHandler<TypeOf<typeof GetDependenciesRequestSchema.params>>;
export declare const installPackageFromRegistryHandler: FleetRequestHandler<TypeOf<typeof InstallPackageFromRegistryRequestSchema.params> | TypeOf<typeof InstallPackageFromRegistryWithoutVersionRequestSchema.params>, TypeOf<typeof InstallPackageFromRegistryRequestSchema.query>, TypeOf<typeof InstallPackageFromRegistryRequestSchema.body>>;
export declare const createCustomIntegrationHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof CreateCustomIntegrationRequestSchema.body>>;
export declare const updateCustomIntegrationHandler: FleetRequestHandler<TypeOf<typeof CustomIntegrationRequestSchema.body>>;
export declare const bulkInstallPackagesFromRegistryHandler: FleetRequestHandler<undefined, TypeOf<typeof BulkInstallPackagesFromRegistryRequestSchema.query>, TypeOf<typeof BulkInstallPackagesFromRegistryRequestSchema.body>>;
export declare const installPackageByUploadHandler: FleetRequestHandler<undefined, TypeOf<typeof InstallPackageByUploadRequestSchema.query>, TypeOf<typeof InstallPackageByUploadRequestSchema.body>>;
export declare const deletePackageHandler: FleetRequestHandler<TypeOf<typeof DeletePackageRequestSchema.params> | TypeOf<typeof DeletePackageWithoutVersionRequestSchema.params>, TypeOf<typeof DeletePackageRequestSchema.query>>;
export declare const getVerificationKeyIdHandler: FleetRequestHandler;
/**
 * Create transform and optionally start transform
 * Note that we want to add the current user's roles/permissions to the es-secondary-auth with a API Key.
 * If API Key has insufficient permissions, it should still create the transforms but not start it
 * Instead of failing, we need to allow package to continue installing other assets
 * and prompt for users to authorize the transforms with the appropriate permissions after package is done installing
 */
export declare const reauthorizeTransformsHandler: FleetRequestHandler<TypeOf<typeof InstallPackageFromRegistryRequestSchema.params>, TypeOf<typeof InstallPackageFromRegistryRequestSchema.query>, TypeOf<typeof ReauthorizeTransformRequestSchema.body>>;
export declare const getInputsHandler: FleetRequestHandler<TypeOf<typeof GetInputsRequestSchema.params>, TypeOf<typeof GetInputsRequestSchema.query>, undefined>;
export declare const getKnowledgeBaseHandler: FleetRequestHandler<TypeOf<typeof GetKnowledgeBaseRequestSchema.params>>;
export declare const rollbackPackageHandler: FleetRequestHandler<TypeOf<typeof RollbackPackageRequestSchema.params>>;
export declare const rollbackAvailableCheckHandler: FleetRequestHandler<TypeOf<typeof RollbackPackageRequestSchema.params>>;
export declare const bulkRollbackAvailableCheckHandler: FleetRequestHandler;

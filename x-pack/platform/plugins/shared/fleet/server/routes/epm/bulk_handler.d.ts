import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import type { BulkRollbackPackagesRequestSchema, BulkNamespaceCustomizationRequestSchema, BulkUninstallPackagesRequestSchema, BulkUpgradePackagesRequestSchema, FleetRequestHandler, GetOneBulkOperationPackagesRequestSchema } from '../../types';
export declare const postBulkUpgradePackagesHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof BulkUpgradePackagesRequestSchema.body>>;
export declare const postBulkUninstallPackagesHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof BulkUninstallPackagesRequestSchema.body>>;
export declare const getOneBulkOperationPackagesHandler: FleetRequestHandler<TypeOf<typeof GetOneBulkOperationPackagesRequestSchema.params>>;
export declare const getPackagePolicyIdsForCurrentUser: (request: KibanaRequest, packages: {
    name: string;
}[]) => Promise<{
    [packageName: string]: string[];
}>;
export declare const postBulkRollbackPackagesHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof BulkRollbackPackagesRequestSchema.body>>;
export declare const postBulkNamespaceCustomizationHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof BulkNamespaceCustomizationRequestSchema.body>>;

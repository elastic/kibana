import type { SerializableRecord } from '@kbn/utility-types';
import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
export declare const LICENSE_MANAGEMENT_LOCATOR_ID = "LICENSE_MANAGEMENT_LOCATOR";
export declare const UPLOAD_LICENSE_ROUTE = "upload_license";
export interface LicenseManagementLocatorParams extends SerializableRecord {
    page: 'dashboard' | 'upload_license';
}
export type LicenseManagementLocator = LocatorPublic<LicenseManagementLocatorParams>;
export interface LicenseManagementLocatorDefinitionDependencies {
    managementAppLocator: ManagementAppLocator;
}
export declare class LicenseManagementLocatorDefinition implements LocatorDefinition<LicenseManagementLocatorParams> {
    protected readonly deps: LicenseManagementLocatorDefinitionDependencies;
    constructor(deps: LicenseManagementLocatorDefinitionDependencies);
    readonly id = "LICENSE_MANAGEMENT_LOCATOR";
    readonly getLocation: (params: LicenseManagementLocatorParams) => Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
}

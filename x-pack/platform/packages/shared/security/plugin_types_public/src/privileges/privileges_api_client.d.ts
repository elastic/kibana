import type { RawKibanaPrivileges } from '@kbn/security-plugin-types-common';
export interface PrivilegesAPIClientGetAllArgs {
    includeActions: boolean;
    respectLicenseLevel: boolean;
}
export declare abstract class PrivilegesAPIClientPublicContract {
    abstract getAll(args: PrivilegesAPIClientGetAllArgs): Promise<RawKibanaPrivileges>;
}

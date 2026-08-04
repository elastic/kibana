import type { HttpStart } from '@kbn/core/public';
import type { RawKibanaPrivileges } from '@kbn/security-plugin-types-common';
import { PrivilegesAPIClientPublicContract } from '@kbn/security-plugin-types-public';
import type { BuiltinESPrivileges } from '../../../common/model';
export declare class PrivilegesAPIClient extends PrivilegesAPIClientPublicContract {
    private readonly http;
    constructor(http: HttpStart);
    getAll({ includeActions, respectLicenseLevel, }: {
        includeActions: boolean;
        respectLicenseLevel: boolean;
    }): Promise<RawKibanaPrivileges>;
    getBuiltIn(): Promise<BuiltinESPrivileges>;
}

import type { CheckPrivilegesDynamicallyWithRequest, CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import type { SpacesService } from '../plugin';
export declare function checkPrivilegesDynamicallyWithRequestFactory(checkPrivilegesWithRequest: CheckPrivilegesWithRequest, getSpacesService: () => SpacesService | undefined): CheckPrivilegesDynamicallyWithRequest;

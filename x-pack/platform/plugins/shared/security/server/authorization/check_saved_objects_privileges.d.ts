import type { CheckPrivilegesWithRequest, CheckSavedObjectsPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import type { SpacesService } from '../plugin';
export declare const checkSavedObjectsPrivilegesWithRequestFactory: (checkPrivilegesWithRequest: CheckPrivilegesWithRequest, getSpacesService: () => SpacesService | undefined) => CheckSavedObjectsPrivilegesWithRequest;

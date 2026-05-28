import type { KibanaRequest } from '@kbn/core/server';
import type { CheckPrivilegesOptions, CheckPrivilegesPayload, CheckPrivilegesResponse } from './check_privileges';
export type CheckPrivilegesDynamically = (privileges: CheckPrivilegesPayload, options?: CheckPrivilegesOptions) => Promise<CheckPrivilegesResponse>;
export type CheckPrivilegesDynamicallyWithRequest = (request: KibanaRequest) => CheckPrivilegesDynamically;

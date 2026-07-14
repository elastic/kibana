import type { KibanaRequest } from '@kbn/core/server';
import type { CheckPrivilegesResponse } from './check_privileges';
export type CheckSavedObjectsPrivilegesWithRequest = (request: KibanaRequest) => CheckSavedObjectsPrivileges;
export type CheckSavedObjectsPrivileges = (actions: string | string[], namespaceOrNamespaces?: string | Array<undefined | string>) => Promise<CheckPrivilegesResponse>;

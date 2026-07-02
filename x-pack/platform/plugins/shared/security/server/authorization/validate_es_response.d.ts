import type { HasPrivilegesResponse } from '@kbn/security-plugin-types-server';
/**
 * Validates an Elasticsearch "Has privileges" response against the expected application, actions, and resources.
 *
 * Note: the `actions` and `resources` parameters must be unique string arrays; any duplicates will cause validation to fail.
 */
export declare function validateEsPrivilegeResponse(response: HasPrivilegesResponse, application: string, actions: string[], resources: string[]): HasPrivilegesResponse;

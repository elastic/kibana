import type { KueryNode } from '@kbn/es-query';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { Authorization } from './authorization';
import type { AuthFilterHelpers, OperationDetails } from './types';
export declare const getOwnersFilter: (savedObjectType: string, owners: string[]) => KueryNode | undefined;
export declare const combineFilterWithAuthorizationFilter: (filter?: KueryNode, authorizationFilter?: KueryNode) => KueryNode | undefined;
export declare const ensureFieldIsSafeForQuery: (field: string, value: string) => boolean;
export declare const includeFieldsRequiredForAuthentication: (fields?: string[]) => string[] | undefined;
/**
 * Returns an authorization filter that covers both the legacy `cases-comments`
 * and the unified `cases-attachments` saved object types based on feature flag
 */
export declare const getAttachmentAuthorizationFilter: (authorization: Pick<Authorization, "getAuthorizationFilter">, operation: OperationDetails, { isCasesAttachmentsEnabled }: {
    isCasesAttachmentsEnabled: boolean;
}) => Promise<AuthFilterHelpers>;
export declare const groupByAuthorization: <T extends {
    owner: string;
}>(savedObjects: Array<SavedObject<T>>, authorizedOwners: string[]) => {
    authorized: Array<SavedObject<T>>;
    unauthorized: Array<SavedObject<T>>;
};

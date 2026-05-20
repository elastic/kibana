import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AuthFilterHelpers, OwnerEntity } from './types';
import type { OperationDetails } from '.';
import { AuthorizationAuditLogger } from '.';
/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export declare class Authorization {
    private readonly request;
    private readonly securityAuth;
    private readonly featureCaseOwners;
    private readonly auditLogger;
    private constructor();
    /**
     * Creates an Authorization object.
     */
    static create({ request, securityAuth, spaces, features, auditLogger, logger, }: {
        request: KibanaRequest;
        securityAuth?: SecurityPluginStart['authz'];
        spaces?: SpacesPluginStart;
        features: FeaturesPluginStart;
        auditLogger: AuthorizationAuditLogger;
        logger: Logger;
    }): Promise<Authorization>;
    private shouldCheckAuthorization;
    /**
     * Checks that the user making the request for the passed in owner, saved object, and operation has the correct authorization. This
     * function will throw if the user is not authorized for the requested operation and owners.
     *
     * @param entities an array of entities describing the case owners in conjunction with the saved object ID attempting
     *  to be authorized
     * @param operation information describing the operation attempting to be authorized
     */
    ensureAuthorized({ entities, operation, }: {
        entities: OwnerEntity[];
        operation: OperationDetails | OperationDetails[];
    }): Promise<void>;
    /**
     *
     * Returns all authorized entities for an operation. It throws error if the user is not authorized
     * to any of the owners
     *
     * @param savedObjects an array of saved objects to be authorized. Each saved objects should contain
     * an ID and an owner
     * @param operation the operation that should be authorized
     */
    getAndEnsureAuthorizedEntities<T extends {
        owner: string;
    }>({ savedObjects, operation, }: {
        savedObjects: Array<SavedObject<T>>;
        operation: OperationDetails;
    }): Promise<{
        authorized: Array<SavedObject<T>>;
        unauthorized: Array<SavedObject<T>>;
    }>;
    private logSavedObjects;
    /**
     * Returns an object to filter the saved object find request to the authorized owners of an entity.
     */
    getAuthorizationFilter(operation: OperationDetails): Promise<AuthFilterHelpers>;
    private _ensureAuthorized;
    private _getAuthorizationFilter;
    private getAuthorizedOwners;
}

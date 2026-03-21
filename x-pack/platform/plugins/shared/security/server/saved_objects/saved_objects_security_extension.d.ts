import type { EcsEvent } from '@elastic/ecs';
import type { Payload } from '@hapi/boom';
import type { SavedObjectsClient } from '@kbn/core/server';
import { type Either, type SavedObjectAccessControl, type SavedObjectReferenceWithContext, type SavedObjectsFindResult, type SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type { AuthorizationTypeMap, AuthorizeAndRedactInternalBulkResolveParams, AuthorizeAndRedactMultiNamespaceReferencesParams, AuthorizeBulkCreateParams, AuthorizeBulkDeleteParams, AuthorizeBulkGetParams, AuthorizeBulkUpdateParams, AuthorizeChangeAccessControlParams, AuthorizeCheckConflictsParams, AuthorizeCreateParams, AuthorizeDeleteParams, AuthorizeFindParams, AuthorizeGetParams, AuthorizeOpenPointInTimeParams, AuthorizeUpdateParams, AuthorizeUpdateSpacesParams, BulkResolveError, CheckAuthorizationResult, GetFindRedactTypeMapParams, ISavedObjectsSecurityExtension, ISavedObjectTypeRegistry, RedactNamespacesParams, SavedObject, WithAuditName } from '@kbn/core-saved-objects-server';
import type { AuthorizationResult } from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { Actions, AuditLogger, CheckSavedObjectsPrivileges } from '@kbn/security-plugin-types-server';
import { AccessControlService } from './access_control_service';
import { SecurityAction } from './types';
interface Params {
    actions: Actions;
    auditLogger: AuditLogger;
    errors: SavedObjectsClient['errors'];
    checkPrivileges: CheckSavedObjectsPrivileges;
    getCurrentUser: () => AuthenticatedUser | null;
    typeRegistry: ISavedObjectTypeRegistry;
}
/**
 * The AuditAction enumeration contains values for all
 * valid audit actions for use in AddAuditEventParams.
 */
export declare enum AuditAction {
    CREATE = "saved_object_create",
    GET = "saved_object_get",
    RESOLVE = "saved_object_resolve",
    UPDATE = "saved_object_update",
    DELETE = "saved_object_delete",
    FIND = "saved_object_find",
    REMOVE_REFERENCES = "saved_object_remove_references",
    OPEN_POINT_IN_TIME = "saved_object_open_point_in_time",
    CLOSE_POINT_IN_TIME = "saved_object_close_point_in_time",
    COLLECT_MULTINAMESPACE_REFERENCES = "saved_object_collect_multinamespace_references",// this is separate from 'saved_object_get' because the user is only accessing an object's metadata
    UPDATE_OBJECTS_SPACES = "saved_object_update_objects_spaces",// this is separate from 'saved_object_update' because the user is only updating an object's metadata
    UPDATE_OBJECTS_OWNER = "saved_object_update_objects_owner",
    UPDATE_OBJECTS_ACCESS_MODE = "saved_object_update_objects_access_mode"
}
/**
 * Saved object information
 */
export interface SavedObjectAudit {
    type: string;
    id: string;
    name?: string;
    accessControl?: SavedObjectAccessControl;
}
/**
 * The AddAuditEventParams interface contains settings for adding
 * audit events via the ISavedObjectsSecurityExtension. This is
 * used only for the private addAuditEvent method.
 */
export interface AddAuditEventParams {
    /** The relevant action */
    action: AuditAction;
    /**
     * The outcome of the operation
     * 'failure' | 'success' | 'unknown'
     */
    outcome?: EcsEvent['outcome'];
    /**
     * Relevant saved object information
     * object containing type & id strings
     */
    savedObject?: SavedObjectAudit;
    /**
     * Array of spaces being added. For
     * UPDATE_OBJECTS_SPACES action only
     */
    addToSpaces?: readonly string[];
    /**
     * Array of spaces being removed.
     * For the UPDATE_OBJECTS_SPACES action
     * and the auditObjectsForSpaceDeletions method
     */
    deleteFromSpaces?: readonly string[];
    /**
     * Array of saved object types not authorized for the action.
     * Used with FIND and OPEN_POINT_IN_TIME_FOR_TYPE actions
     */
    unauthorizedTypes?: readonly string[];
    /**
     * Array of spaces not authorized for the action.
     * Used with FIND and OPEN_POINT_IN_TIME_FOR_TYPE actions
     */
    unauthorizedSpaces?: readonly string[];
    /**
     * Relevant error information to add to
     * the audit event
     */
    error?: Error;
}
/**
 * The InternalAuthorizeParams interface contains settings for checking
 * & enforcing authorization via the ISavedObjectsSecurityExtension. This
 * is used only for the private authorize method.
 */
interface InternalAuthorizeParams {
    /** A set of actions to check */
    actions: Set<SecurityAction>;
    /** A set of types to check */
    types: Set<string>;
    /** A set of spaces to check */
    spaces: Set<string>;
    /**
     * A map of types (key) to spaces (value) that will be affected by the action(s).
     * If undefined, enforce will be bypassed.
     */
    enforceMap?: Map<string, Set<string>>;
    /** Options for authorization*/
    options?: {
        /** allowGlobalResource - whether or not to allow global resources, false if options are undefined */
        allowGlobalResource?: boolean;
    };
    /** auditOptions - options for audit logging */
    auditOptions?: AuditOptions;
}
/**
 * The AuditOptions interface contains optional settings for audit
 * logging within the ISavedObjectsSecurityExtension.
 */
interface AuditOptions {
    /**
     * An array of applicable objects for the authorization action
     * If undefined or empty, general auditing will occur (one log/action)
     */
    objects?: SavedObjectAudit[];
    /**
     * Whether or not to bypass audit logging on authz success, authz failure, always, or never. Default never.
     */
    bypass?: 'never' | 'on_success' | 'on_failure' | 'always';
    /** If authz success should be logged as 'success'. Default false */
    useSuccessOutcome?: boolean;
    /** An array of spaces which to add the objects (used in updateObjectsSpaces) */
    addToSpaces?: string[];
    /** An array of spaces from which to remove the objects (used in updateObjectsSpaces) */
    deleteFromSpaces?: string[];
}
export declare class SavedObjectsSecurityExtension implements ISavedObjectsSecurityExtension {
    private readonly actions;
    private readonly auditLogger;
    private readonly errors;
    private readonly checkPrivilegesFunc;
    private readonly getCurrentUserFunc;
    private readonly actionMap;
    private readonly typeRegistry;
    readonly accessControlService: AccessControlService;
    constructor({ actions, auditLogger, errors, checkPrivileges, getCurrentUser, typeRegistry, }: Params);
    private assertObjectsArrayNotEmpty;
    private translateActions;
    private decodeSecurityAction;
    private checkAuthorization;
    private auditHelper;
    private allAccessControlObjectsAreInaccessible;
    private allRequestedObjectAreInaccessible;
    private enforceAuthorization;
    /**
     * The authorize method is the central method for authorization within the extension. It handles
     * checking and enforcing authorization, and passing audit parameters down to the enforce method.
     *
     * If an enforce map is not provided, this method will NOT enforce authorization nor audit the action.
     * If an enforce map is provided and the action is unauthorized for any type in any space mapped for
     * that type, this method will throw (because the enforce method will throw).
     *
     * This method not marked as private, but not exposed via the interface
     * This allows us to test it thoroughly in the unit test suite, but keep it from being exposed to consumers.
     * @param params actions, types, and spaces to check, the enforce map (types to enforce in which spaces), options, and audit options
     * @returns CheckAuthorizationResult - the result from the authorizations check
     */
    authorize<A extends string>(params: InternalAuthorizeParams): Promise<AuthorizationResult<string>>;
    private maybeRedactSavedObject;
    private addAuditEvent;
    private checkPrivileges;
    redactNamespaces<T, A extends string>(params: RedactNamespacesParams<T, A>): SavedObject<T>;
    authorizeCreate<A extends string>(params: AuthorizeCreateParams): Promise<AuthorizationResult<A>>;
    authorizeBulkCreate<A extends string>(params: AuthorizeBulkCreateParams): Promise<AuthorizationResult<A>>;
    private internalAuthorizeCreate;
    authorizeUpdate<A extends string>(params: AuthorizeUpdateParams): Promise<AuthorizationResult<A>>;
    authorizeBulkUpdate<A extends string>(params: AuthorizeBulkUpdateParams): Promise<AuthorizationResult<A>>;
    private internalAuthorizeUpdate;
    authorizeDelete<A extends string>(params: AuthorizeDeleteParams): Promise<AuthorizationResult<A>>;
    authorizeBulkDelete<A extends string>(params: AuthorizeBulkDeleteParams): Promise<AuthorizationResult<A>>;
    private internalAuthorizeDelete;
    authorizeGet<A extends string>(params: AuthorizeGetParams): Promise<AuthorizationResult<A>>;
    authorizeBulkGet<A extends string>(params: AuthorizeBulkGetParams): Promise<AuthorizationResult<A>>;
    authorizeCheckConflicts<A extends string>(params: AuthorizeCheckConflictsParams): Promise<AuthorizationResult<A>>;
    authorizeRemoveReferences<A extends string>(params: AuthorizeDeleteParams): Promise<AuthorizationResult<A>>;
    authorizeOpenPointInTime<A extends string>(params: AuthorizeOpenPointInTimeParams): Promise<AuthorizationResult<A>>;
    authorizeChangeAccessControl<A extends string>(params: AuthorizeChangeAccessControlParams, operation: 'changeAccessMode' | 'changeOwnership'): Promise<AuthorizationResult<A>>;
    internalAuthorizeChangeAccessControl<A extends string>(params: AuthorizeChangeAccessControlParams, action: SecurityAction): Promise<AuthorizationResult<A>>;
    auditClosePointInTime(): void;
    authorizeAndRedactMultiNamespaceReferences(params: AuthorizeAndRedactMultiNamespaceReferencesParams): Promise<SavedObjectReferenceWithContext[]>;
    authorizeAndRedactInternalBulkResolve<T = unknown>(params: AuthorizeAndRedactInternalBulkResolveParams<T>): Promise<Array<SavedObjectsResolveResponse<T> | BulkResolveError>>;
    authorizeUpdateSpaces<A extends string>(params: AuthorizeUpdateSpacesParams): Promise<CheckAuthorizationResult<A>>;
    authorizeFind<A extends string>(params: AuthorizeFindParams): Promise<CheckAuthorizationResult<A>>;
    getFindRedactTypeMap<A extends string>(params: GetFindRedactTypeMapParams): Promise<AuthorizationTypeMap<A> | undefined>;
    authorizeDisableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]): Promise<void>;
    auditObjectsForSpaceDeletion<T>(spaceId: string, resultObjects: Array<WithAuditName<SavedObjectsFindResult<T>>>): void;
    getCurrentUser(): AuthenticatedUser | null;
    includeSavedObjectNames(): boolean;
    /**
     * Filters out objects that are inaccessible due to access control restrictions during bulk actions.
     * If an object is found in the `inaccessibleObjects` array, returns a left error result for that object.
     * Otherwise, returns the original expected result with an updated esRequestIndex.
     *
     * @template L - Left (error) type
     * @template R - Right (success) type
     * @param expectedResults - Array of Either<L, R> results (left: error, right: valid object)
     * @param inaccessibleObjects - Array of objects that are inaccessible due to access control
     * @returns Array of Either<L, R> with inaccessible objects converted to error results
     */
    filterInaccessibleObjectsForBulkAction<L extends {
        type: string;
        id?: string;
        error: Payload;
    }, R extends {
        type: string;
        id: string;
        esRequestIndex?: number;
    }>(expectedResults: Array<Either<L, R>>, inaccessibleObjects: Array<{
        type: string;
        id: string;
    }>, action: 'bulk_create' | 'bulk_update' | 'bulk_delete', reindex?: boolean): Promise<Array<Either<L, R>>>;
}
export {};

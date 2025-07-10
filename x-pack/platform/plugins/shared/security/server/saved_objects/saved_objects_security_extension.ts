/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@elastic/ecs';

import type {
  SavedObjectReferenceWithContext,
  SavedObjectsFindResult,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { isBulkResolveError } from '@kbn/core-saved-objects-api-server-internal/src/lib/apis/internals/internal_bulk_resolve';
import { LEGACY_URL_ALIAS_TYPE } from '@kbn/core-saved-objects-base-server-internal';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  AuthorizationTypeEntry,
  AuthorizationTypeMap,
  AuthorizeAndRedactInternalBulkResolveParams,
  AuthorizeAndRedactMultiNamespaceReferencesParams,
  AuthorizeBulkCreateParams,
  AuthorizeBulkDeleteParams,
  AuthorizeBulkGetParams,
  AuthorizeBulkUpdateParams,
  AuthorizeCheckConflictsParams,
  AuthorizeCreateParams,
  AuthorizeDeleteParams,
  AuthorizeFindParams,
  AuthorizeGetParams,
  AuthorizeOpenPointInTimeParams,
  AuthorizeUpdateParams,
  AuthorizeUpdateSpacesParams,
  BulkResolveError,
  CheckAuthorizationResult,
  GetFindRedactTypeMapParams,
  ISavedObjectsSecurityExtension,
  RedactNamespacesParams,
  SavedObject,
  WithAuditName,
} from '@kbn/core-saved-objects-server';
import type { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type {
  Actions,
  AuditLogger,
  CheckPrivilegesResponse,
  CheckSavedObjectsPrivileges,
} from '@kbn/security-plugin-types-server';

import { isAuthorizedInAllSpaces } from './authorization_utils';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import { savedObjectEvent } from '../audit';

interface Params {
  actions: Actions;
  auditLogger: AuditLogger;
  errors: SavedObjectsClient['errors'];
  checkPrivileges: CheckSavedObjectsPrivileges;
  getCurrentUser: () => AuthenticatedUser | null;
}

/**
 * The SecurityAction enumeration contains values for all valid shared object
 * security actions. The string for each value correlates to the ES operation.
 */
export enum SecurityAction {
  CHECK_CONFLICTS,
  CLOSE_POINT_IN_TIME,
  COLLECT_MULTINAMESPACE_REFERENCES,
  COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
  CREATE,
  BULK_CREATE,
  DELETE,
  BULK_DELETE,
  FIND,
  GET,
  BULK_GET,
  INTERNAL_BULK_RESOLVE,
  OPEN_POINT_IN_TIME,
  REMOVE_REFERENCES,
  UPDATE,
  BULK_UPDATE,
  UPDATE_OBJECTS_SPACES,
}

/**
 * The AuditAction enumeration contains values for all
 * valid audit actions for use in AddAuditEventParams.
 */
export enum AuditAction {
  CREATE = 'saved_object_create',
  GET = 'saved_object_get',
  RESOLVE = 'saved_object_resolve',
  UPDATE = 'saved_object_update',
  DELETE = 'saved_object_delete',
  FIND = 'saved_object_find',
  REMOVE_REFERENCES = 'saved_object_remove_references',
  OPEN_POINT_IN_TIME = 'saved_object_open_point_in_time',
  CLOSE_POINT_IN_TIME = 'saved_object_close_point_in_time',
  COLLECT_MULTINAMESPACE_REFERENCES = 'saved_object_collect_multinamespace_references', // this is separate from 'saved_object_get' because the user is only accessing an object's metadata
  UPDATE_OBJECTS_SPACES = 'saved_object_update_objects_spaces', // this is separate from 'saved_object_update' because the user is only updating an object's metadata
}

/**
 * Saved object information
 */
export interface SavedObjectAudit {
  type: string;
  id: string;
  name?: string;
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
 * The InternalAuthorizeOptions interface contains basic options
 * for internal authorize methods of the ISavedObjectsSecurityExtension.
 */
interface InternalAuthorizeOptions {
  /**
   * Whether or not to force the use of the bulk action for the authorization.
   * By default this will be based on the number of objects passed to the
   * authorize method.
   */
  forceBulkAction: boolean;
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
 * The EnforceAuthorizationParams interface contains settings for
 * enforcing a single action via the ISavedObjectsSecurityExtension.
 * This is used only for the private enforceAuthorization method.
 */
interface EnforceAuthorizationParams<A extends string> {
  /** A map of types to spaces that will be affected by the action */
  typesAndSpaces: Map<string, Set<string>>;
  /** The relevant security action (create, update, etc.) */
  action: SecurityAction;
  /**
   * The authorization map from CheckAuthorizationResult: a
   * map of type to record of action/AuthorizationTypeEntry
   * (spaces/globallyAuthz'd)
   */
  typeMap: AuthorizationTypeMap<A>;
  /** auditOptions - options for audit logging */
  auditOptions?: AuditOptions;
}

/**
 * The AuditHelperParams interface contains parameters to log audit events
 * within the ISavedObjectsSecurityExtension.
 */
interface AuditHelperParams {
  /** The audit action to log */
  action: AuditAction;
  /** The objects applicable to the action */
  objects?: SavedObjectAudit[];
  /** Whether or not to use success as the non-failure outcome. Default is 'unknown' */
  useSuccessOutcome?: boolean;
  /**
   * The spaces in which to add the objects
   * Used only with the AuditAction.UPDATE_OBJECTS_SPACES
   * Default is none
   */
  addToSpaces?: string[];
  /**
   * The spaces from which to remove the objects
   * Used only with the AuditAction.UPDATE_OBJECTS_SPACES
   * action and the auditObjectsForSpaceDeletions method
   * Default is none
   */
  deleteFromSpaces?: string[];
  /**
   * The spaces unauthorized for the action
   * Used with AuditAction.FIND and AuditAction.OPEN_POINT_IN_TIME
   */
  unauthorizedSpaces?: string[];
  /**
   * The types unauthorized for the action
   * Used with AuditAction.FIND and AuditAction.OPEN_POINT_IN_TIME
   */
  unauthorizedTypes?: string[];
  /** Error information produced by the action */
  error?: Error;
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

/**
 * The CheckAuthorizationParams interface contains settings for checking
 * authorization via the ISavedObjectsSecurityExtension.
 */
interface CheckAuthorizationParams<A extends string> {
  /** A set of types to check */
  types: Set<string>;
  /** A set of spaces to check */
  spaces: Set<string>;
  /** An set of actions to check */
  actions: Set<A>;
  /** Authorization options */
  options?: {
    /**
     * allowGlobalResource - whether or not to allow global resources, false if options are undefined
     */
    allowGlobalResource: boolean;
  };
}

type SavedObjectWithName<T = unknown> = SavedObject<T> & Pick<SavedObjectAudit, 'name'>;

export class SavedObjectsSecurityExtension implements ISavedObjectsSecurityExtension {
  private readonly actions: Actions;
  private readonly auditLogger: AuditLogger;
  private readonly errors: SavedObjectsClient['errors'];
  private readonly checkPrivilegesFunc: CheckSavedObjectsPrivileges;
  private readonly getCurrentUserFunc: () => AuthenticatedUser | null;
  private readonly actionMap: Map<
    SecurityAction,
    { authzAction?: string; auditAction?: AuditAction }
  >;

  constructor({ actions, auditLogger, errors, checkPrivileges, getCurrentUser }: Params) {
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.errors = errors;
    this.checkPrivilegesFunc = checkPrivileges;
    this.getCurrentUserFunc = getCurrentUser;

    // This comment block is a quick reference for the action map, which maps authorization actions
    // and audit actions to a "security action" as used by the authorization methods.
    // Security Action                    ES AUTH ACTION          AUDIT ACTION
    // -----------------------------------------------------------------------------------------
    // Check Conflicts                    'bulk_create'           N/A
    // Close PIT                          N/A                     AuditAction.CLOSE_POINT_IN_TIME
    // Collect References                 'bulk_get'              AuditAction.COLLECT_MULTINAMESPACE_REFERENCES
    // Collect Refs For Updating Spaces   'share_to_space'        AuditAction.COLLECT_MULTINAMESPACE_REFERENCES
    // Create                             'create'                AuditAction.CREATE
    // Bulk Create                        'bulk_create'           AuditAction.CREATE
    // Delete                             'delete'                AuditAction.DELETE
    // Bulk Delete                        'bulk_delete'           AuditAction.DELETE
    // Find                               'find'                  AuditAction.FIND
    // Get                                'get'                   AuditAction.GET
    // Bulk Get                           'bulk_get'              AuditAction.GET
    // Internal Bulk Resolve              'bulk_get'              AuditAction.RESOLVE
    // Open PIT                           'open_point_in_time'    AuditAction.OPEN_POINT_IN_TIME
    // Remove References                  'delete'                AuditAction.REMOVE_REFERENCES
    // Update                             'update'                AuditAction.UPDATE
    // Bulk Update                        'bulk_update'           AuditAction.UPDATE
    // Update Objects Spaces              'share_to_space'        AuditAction.UPDATE_OBJECTS_SPACES
    this.actionMap = new Map([
      [SecurityAction.CHECK_CONFLICTS, { authzAction: 'bulk_create', auditAction: undefined }],
      [
        SecurityAction.CLOSE_POINT_IN_TIME,
        { authzAction: undefined, auditAction: AuditAction.CLOSE_POINT_IN_TIME },
      ],
      [
        SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
        { authzAction: 'bulk_get', auditAction: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES },
      ],
      [
        SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
        {
          authzAction: 'share_to_space',
          auditAction: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
        },
      ],
      [SecurityAction.CREATE, { authzAction: 'create', auditAction: AuditAction.CREATE }],
      [SecurityAction.BULK_CREATE, { authzAction: 'bulk_create', auditAction: AuditAction.CREATE }],
      [SecurityAction.DELETE, { authzAction: 'delete', auditAction: AuditAction.DELETE }],
      [SecurityAction.BULK_DELETE, { authzAction: 'bulk_delete', auditAction: AuditAction.DELETE }],
      [SecurityAction.FIND, { authzAction: 'find', auditAction: AuditAction.FIND }],
      [SecurityAction.GET, { authzAction: 'get', auditAction: AuditAction.GET }],
      [SecurityAction.BULK_GET, { authzAction: 'bulk_get', auditAction: AuditAction.GET }],
      [
        SecurityAction.INTERNAL_BULK_RESOLVE,
        { authzAction: 'bulk_get', auditAction: AuditAction.RESOLVE },
      ],
      [
        SecurityAction.OPEN_POINT_IN_TIME,
        { authzAction: 'open_point_in_time', auditAction: AuditAction.OPEN_POINT_IN_TIME },
      ],
      [
        SecurityAction.REMOVE_REFERENCES,
        { authzAction: 'delete', auditAction: AuditAction.REMOVE_REFERENCES },
      ],
      [SecurityAction.UPDATE, { authzAction: 'update', auditAction: AuditAction.UPDATE }],
      [SecurityAction.BULK_UPDATE, { authzAction: 'bulk_update', auditAction: AuditAction.UPDATE }],
      [
        SecurityAction.UPDATE_OBJECTS_SPACES,
        { authzAction: 'share_to_space', auditAction: AuditAction.UPDATE_OBJECTS_SPACES },
      ],
    ]);
  }

  private assertObjectsArrayNotEmpty(objects: AuthorizeObject[], action: SecurityAction) {
    if (objects.length === 0) {
      throw new Error(
        `No objects specified for ${
          this.actionMap.get(action)?.authzAction ?? 'unknown'
        } authorization`
      );
    }
  }

  private translateActions<A extends string>(
    securityActions: Set<SecurityAction>
  ): { authzActions: Set<A>; auditActions: Set<AuditAction> } {
    const authzActions = new Set<A>();
    const auditActions = new Set<AuditAction>();
    for (const secAction of securityActions) {
      const { authzAction, auditAction } = this.decodeSecurityAction(secAction);
      if (authzAction) authzActions.add(authzAction as A);
      if (auditAction) auditActions.add(auditAction as AuditAction);
    }
    return { authzActions, auditActions };
  }

  private decodeSecurityAction(securityAction: SecurityAction): {
    authzAction: string | undefined;
    auditAction: AuditAction | undefined;
  } {
    const { authzAction, auditAction } = this.actionMap.get(securityAction)!;
    return { authzAction, auditAction };
  }

  private async checkAuthorization<A extends string>(
    params: CheckAuthorizationParams<A>
  ): Promise<CheckAuthorizationResult<A>> {
    const { types, spaces, actions, options = { allowGlobalResource: false } } = params;
    const { allowGlobalResource } = options;
    if (types.size === 0) {
      throw new Error('No types specified for authorization check');
    }
    if (spaces.size === 0) {
      throw new Error('No spaces specified for authorization check');
    }
    if (actions.size === 0) {
      throw new Error('No actions specified for authorization check');
    }
    const typesArray = [...types];
    const actionsArray = [...actions];
    const privilegeActionsMap = new Map(
      typesArray.flatMap((type) =>
        actionsArray.map((action) => [this.actions.savedObject.get(type, action), { type, action }])
      )
    );
    const privilegeActions = [...privilegeActionsMap.keys(), this.actions.login]; // Always check login action, we will need it later for redacting namespaces
    const { hasAllRequested, privileges } = await this.checkPrivileges(
      privilegeActions,
      getAuthorizableSpaces(spaces, allowGlobalResource)
    );

    const missingPrivileges = getMissingPrivileges(privileges);
    const typeMap = privileges.kibana.reduce<AuthorizationTypeMap<A>>(
      (acc, { resource, privilege }) => {
        const missingPrivilegesAtResource =
          (resource && missingPrivileges.get(resource)?.has(privilege)) ||
          (!resource && missingPrivileges.get(undefined)?.has(privilege));

        if (missingPrivilegesAtResource) {
          return acc;
        }
        let objTypes: string[];
        let action: A;
        if (privilege === this.actions.login) {
          // Technically, 'login:' is not a saved object action, it is a Kibana privilege -- however, we include it in the `typeMap` results
          // for ease of use with the `redactNamespaces` function. The user is never actually authorized to "login" for a given object type,
          // they are authorized to log in on a per-space basis, and this is applied to each object type in the typeMap result accordingly.
          objTypes = typesArray;
          action = this.actions.login as A;
        } else {
          const entry = privilegeActionsMap.get(privilege)!; // always defined
          objTypes = [entry.type];
          action = entry.action;
        }

        for (const type of objTypes) {
          const actionAuthorizations = acc.get(type) ?? ({} as Record<A, AuthorizationTypeEntry>);
          const authorization: AuthorizationTypeEntry = actionAuthorizations[action] ?? {
            authorizedSpaces: [],
          };

          if (resource === undefined) {
            acc.set(type, {
              ...actionAuthorizations,
              [action]: { ...authorization, isGloballyAuthorized: true },
            });
          } else {
            acc.set(type, {
              ...actionAuthorizations,
              [action]: {
                ...authorization,
                authorizedSpaces: authorization.authorizedSpaces.concat(resource),
              },
            });
          }
        }
        return acc;
      },
      new Map()
    );

    if (hasAllRequested) {
      return { typeMap, status: 'fully_authorized' };
    } else if (typeMap.size > 0) {
      for (const entry of typeMap.values()) {
        const typeActions = Object.keys(entry);
        if (actionsArray.some((a) => typeActions.includes(a))) {
          // Only return 'partially_authorized' if the user is actually authorized for one of the actions they requested
          // (e.g., not just the 'login:' action)
          return { typeMap, status: 'partially_authorized' };
        }
      }
    }
    return { typeMap, status: 'unauthorized' };
  }

  private auditHelper(params: AuditHelperParams) {
    const {
      action,
      useSuccessOutcome,
      objects,
      error,
      addToSpaces,
      deleteFromSpaces,
      unauthorizedSpaces,
      unauthorizedTypes,
    } = params;

    // If there are no objects, we at least want to add a single audit log for the action
    const toAudit = !!objects && objects?.length > 0 ? objects : ([undefined] as undefined[]);

    for (const obj of toAudit) {
      this.addAuditEvent({
        action,
        ...(!!obj && { savedObject: { type: obj.type, id: obj.id, name: obj.name } }),
        error,
        // By default, if authorization was a success the outcome is 'unknown' because the operation has not occurred yet
        // The GET action is one of the few exceptions to this, and hence it passes true to useSuccessOutcome
        ...(!error && { outcome: useSuccessOutcome ? 'success' : 'unknown' }),
        addToSpaces,
        deleteFromSpaces,
        unauthorizedSpaces,
        unauthorizedTypes,
      });
    }
  }

  /**
   * The enforce method uses the result of an authorization check authorization map) and a map
   * of types to spaces (type map) to determine if the action is authorized for all types and spaces
   * within the type map. If unauthorized for any type this method will throw.
   */
  private enforceAuthorization<A extends string>(params: EnforceAuthorizationParams<A>): void {
    const { typesAndSpaces, action, typeMap, auditOptions } = params;
    const {
      objects: auditObjects,
      bypass = 'never', // default for bypass
      useSuccessOutcome,
      addToSpaces,
      deleteFromSpaces,
    } = (auditOptions as AuditOptions) ?? {};

    const { authzAction, auditAction } = this.decodeSecurityAction(action);

    const unauthorizedTypes = new Set<string>();

    if (authzAction) {
      for (const [type, spaces] of typesAndSpaces) {
        const spacesArray = [...spaces];
        if (!isAuthorizedInAllSpaces(type, authzAction as A, spacesArray, typeMap)) {
          unauthorizedTypes.add(type);
        }
      }
    }

    if (unauthorizedTypes.size > 0) {
      const targetTypes = [...unauthorizedTypes].sort().join(',');
      const msg = `Unable to ${authzAction} ${targetTypes}`;
      const error = this.errors.decorateForbiddenError(new Error(msg));
      if (auditAction && bypass !== 'always' && bypass !== 'on_failure') {
        this.auditHelper({
          action: auditAction,
          objects: auditObjects,
          useSuccessOutcome,
          addToSpaces,
          deleteFromSpaces,
          error,
        });
      }
      throw error;
    }

    if (auditAction && bypass !== 'always' && bypass !== 'on_success') {
      this.auditHelper({
        action: auditAction,
        objects: auditObjects,
        useSuccessOutcome,
        addToSpaces,
        deleteFromSpaces,
      });
    }
  }

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
  async authorize<A extends string>(
    params: InternalAuthorizeParams
  ): Promise<CheckAuthorizationResult<string>> {
    if (params.actions.size === 0) {
      throw new Error('No actions specified for authorization');
    }
    if (params.types.size === 0) {
      throw new Error('No types specified for authorization');
    }
    if (params.spaces.size === 0) {
      throw new Error('No spaces specified for authorization');
    }

    const { authzActions } = this.translateActions(params.actions);

    const checkResult: CheckAuthorizationResult<A> = await this.checkAuthorization({
      types: params.types,
      spaces: params.spaces,
      actions: authzActions,
      options: { allowGlobalResource: params.options?.allowGlobalResource === true },
    });

    const typesAndSpaces = params.enforceMap;
    if (typesAndSpaces !== undefined && checkResult) {
      params.actions.forEach((action) => {
        this.enforceAuthorization({
          typesAndSpaces,
          action,
          typeMap: checkResult.typeMap,
          auditOptions: params.auditOptions,
        });
      });
    }

    return checkResult;
  }

  private maybeRedactSavedObject(
    savedObject: SavedObjectAudit | undefined
  ): SavedObjectAudit | undefined {
    if (savedObject && savedObject.name && !this.auditLogger.includeSavedObjectNames) {
      return { id: savedObject.id, type: savedObject.type };
    }

    return savedObject;
  }

  private addAuditEvent(params: AddAuditEventParams): void {
    if (this.auditLogger.enabled) {
      const { savedObject, ...rest } = params;

      const auditEvent = savedObjectEvent({
        savedObject: this.maybeRedactSavedObject(savedObject),
        ...rest,
      });
      this.auditLogger.log(auditEvent);
    }
  }

  private async checkPrivileges(
    actions: string | string[],
    namespaceOrNamespaces?: string | Array<undefined | string>
  ) {
    try {
      return await this.checkPrivilegesFunc(actions, namespaceOrNamespaces);
    } catch (error) {
      throw this.errors.decorateGeneralError(error, error.body && error.body.reason);
    }
  }

  redactNamespaces<T, A extends string>(params: RedactNamespacesParams<T, A>): SavedObject<T> {
    const { savedObject, typeMap } = params;
    const loginAction = this.actions.login as A; // This typeMap came from the `checkAuthorization` function, which always checks privileges for the "login" action (in addition to what the consumer requested)
    const actionRecord = typeMap.get(savedObject.type);
    const entry: AuthorizationTypeEntry = actionRecord?.[loginAction] ?? { authorizedSpaces: [] }; // fail-secure if attribute is not defined
    const { authorizedSpaces, isGloballyAuthorized } = entry;

    if (isGloballyAuthorized || !savedObject.namespaces?.length) {
      return savedObject;
    }
    const authorizedSpacesSet = new Set(authorizedSpaces);
    const redactedSpaces = savedObject.namespaces
      ?.map((x) => (x === ALL_SPACES_ID || authorizedSpacesSet.has(x) ? x : UNKNOWN_SPACE))
      .sort(namespaceComparator);
    return { ...savedObject, namespaces: redactedSpaces };
  }

  async authorizeCreate<A extends string>(
    params: AuthorizeCreateParams
  ): Promise<CheckAuthorizationResult<A>> {
    return this.internalAuthorizeCreate({
      namespace: params.namespace,
      objects: [params.object],
    });
  }

  async authorizeBulkCreate<A extends string>(
    params: AuthorizeBulkCreateParams
  ): Promise<CheckAuthorizationResult<A>> {
    return this.internalAuthorizeCreate(params, { forceBulkAction: true });
  }

  private async internalAuthorizeCreate<A extends string>(
    params: AuthorizeBulkCreateParams,
    options?: InternalAuthorizeOptions
  ): Promise<CheckAuthorizationResult<A>> {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(params.namespace);
    const { objects } = params;

    const action =
      options?.forceBulkAction || objects.length > 1
        ? SecurityAction.BULK_CREATE
        : SecurityAction.CREATE;

    this.assertObjectsArrayNotEmpty(objects, action);

    const enforceMap = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space

    // If a user tries to create an object with `initialNamespaces: ['*']`, they need to have 'create' privileges for the Global Resource
    // (e.g., All privileges for All Spaces).
    // Inversely, if a user tries to overwrite an object that already exists in '*', they don't need to 'create' privileges for the Global
    // Resource, so in that case we have to filter out that string from spacesToAuthorize (because `allowGlobalResource: true` is used
    // below.)
    for (const obj of objects) {
      const spacesToEnforce = enforceMap.get(obj.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      for (const space of obj.initialNamespaces ?? []) {
        spacesToEnforce.add(space);
        spacesToAuthorize.add(space);
      }
      enforceMap.set(obj.type, spacesToEnforce);

      for (const space of obj.existingNamespaces) {
        // Don't accidentally check for global privileges when the object exists in '*'
        if (space !== ALL_NAMESPACES_STRING) {
          spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
        }
      }
    }

    const authorizationResult = await this.authorize({
      actions: new Set([action]),
      types: new Set(enforceMap.keys()),
      spaces: spacesToAuthorize,
      enforceMap,
      options: { allowGlobalResource: true },
      auditOptions: { objects },
    });

    return authorizationResult;
  }

  async authorizeUpdate<A extends string>(
    params: AuthorizeUpdateParams
  ): Promise<CheckAuthorizationResult<A>> {
    return this.internalAuthorizeUpdate({
      namespace: params.namespace,
      objects: [params.object],
    });
  }

  async authorizeBulkUpdate<A extends string>(
    params: AuthorizeBulkUpdateParams
  ): Promise<CheckAuthorizationResult<A>> {
    return this.internalAuthorizeUpdate(params, { forceBulkAction: true });
  }

  private async internalAuthorizeUpdate<A extends string>(
    params: AuthorizeBulkUpdateParams,
    options?: InternalAuthorizeOptions
  ): Promise<CheckAuthorizationResult<A>> {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(params.namespace);
    const { objects } = params;

    const action =
      options?.forceBulkAction || objects.length > 1
        ? SecurityAction.BULK_UPDATE
        : SecurityAction.UPDATE;

    this.assertObjectsArrayNotEmpty(objects, action);

    const enforceMap = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space

    for (const obj of objects) {
      const {
        type,
        objectNamespace: objectNamespace,
        existingNamespaces: existingNamespaces,
      } = obj;
      const objectNamespaceString = objectNamespace ?? namespaceString;

      const spacesToEnforce = enforceMap.get(type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      spacesToEnforce.add(objectNamespaceString);
      enforceMap.set(type, spacesToEnforce);
      spacesToAuthorize.add(objectNamespaceString);

      for (const space of existingNamespaces) {
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }
    }

    const authorizationResult = await this.authorize({
      actions: new Set([action]),
      types: new Set(enforceMap.keys()),
      spaces: spacesToAuthorize,
      enforceMap,
      auditOptions: { objects },
    });

    return authorizationResult;
  }

  async authorizeDelete<A extends string>(
    params: AuthorizeDeleteParams
  ): Promise<CheckAuthorizationResult<A>> {
    return this.internalAuthorizeDelete({
      namespace: params.namespace,
      // delete params does not contain existingNamespaces because authz
      // occurs prior to the preflight check. This is ok because we are
      // only concerned with enforcing the current space.
      objects: [{ ...params.object, existingNamespaces: [] }],
    });
  }

  async authorizeBulkDelete<A extends string>(
    params: AuthorizeBulkDeleteParams
  ): Promise<CheckAuthorizationResult<A>> {
    return this.internalAuthorizeDelete(params, { forceBulkAction: true });
  }

  private async internalAuthorizeDelete<A extends string>(
    params: AuthorizeBulkDeleteParams,
    options?: InternalAuthorizeOptions
  ): Promise<CheckAuthorizationResult<A>> {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(params.namespace);
    const { objects } = params;
    const enforceMap = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space

    const action =
      options?.forceBulkAction || objects.length > 1
        ? SecurityAction.BULK_DELETE
        : SecurityAction.DELETE;

    this.assertObjectsArrayNotEmpty(objects, action);

    for (const obj of objects) {
      const { type } = obj;
      const spacesToEnforce = enforceMap.get(type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      enforceMap.set(type, spacesToEnforce);
      for (const space of obj.existingNamespaces) {
        spacesToAuthorize.add(space); // existing namespaces are authorized but not enforced
      }
    }

    return this.authorize({
      actions: new Set([action]),
      types: new Set(enforceMap.keys()),
      spaces: spacesToAuthorize,
      enforceMap,
      auditOptions: {
        objects,
      },
    });
  }

  async authorizeGet<A extends string>(
    params: AuthorizeGetParams
  ): Promise<CheckAuthorizationResult<A>> {
    const { namespace, object, objectNotFound } = params;
    const spacesToEnforce = new Set([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always check/enforce authZ for the active space
    const existingNamespaces = object.existingNamespaces;

    return await this.authorize({
      actions: new Set([SecurityAction.GET]),
      types: new Set([object.type]),
      spaces: new Set([...spacesToEnforce, ...existingNamespaces]), // existing namespaces are included so we can later redact if necessary
      enforceMap: new Map([[object.type, spacesToEnforce]]),
      auditOptions: { objects: [object], bypass: objectNotFound ? 'on_success' : 'never' }, // Do not audit on success if the object was not found
    });
  }

  async authorizeBulkGet<A extends string>(
    params: AuthorizeBulkGetParams
  ): Promise<CheckAuthorizationResult<A>> {
    const action = SecurityAction.BULK_GET;
    const namespace = SavedObjectsUtils.namespaceIdToString(params.namespace);
    const { objects } = params;
    this.assertObjectsArrayNotEmpty(objects, action);

    const successAuditObjects = new Array<{ type: string; id: string }>();
    const enforceMap = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespace]); // Always check authZ for the active space

    for (const obj of objects) {
      const spacesToEnforce = enforceMap.get(obj.type) ?? new Set([namespace]); // Always enforce authZ for the active space

      // Object namespaces are passed into the repo's bulkGet method per object
      for (const space of obj.objectNamespaces ?? []) {
        spacesToEnforce.add(space);
        enforceMap.set(obj.type, spacesToEnforce);
        spacesToAuthorize.add(space);
      }

      // Existing namespaces are populated fom the bulkGet response docs
      for (const space of obj.existingNamespaces) {
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }

      // We only log success events for objects that were actually found (and are being returned to the user)
      // If enforce fails, we audit for all objects
      if (!obj.error) {
        successAuditObjects.push(obj);
      }
    }

    const authorizationResult = await this.authorize({
      actions: new Set([action]),
      types: new Set(enforceMap.keys()),
      spaces: spacesToAuthorize,
      enforceMap,
      auditOptions: {
        objects,
        useSuccessOutcome: true,
        bypass: 'on_success', // We will override the success case below
      },
    });

    // if we made it here, enforce was a success, so let's audit...
    const { auditAction } = this.decodeSecurityAction(SecurityAction.BULK_GET);
    if (auditAction) {
      this.auditHelper({
        action: auditAction,
        objects: successAuditObjects.length ? successAuditObjects : undefined,
        useSuccessOutcome: true,
      });
    }

    return authorizationResult;
  }

  async authorizeCheckConflicts<A extends string>(
    params: AuthorizeCheckConflictsParams
  ): Promise<CheckAuthorizationResult<A>> {
    const action = SecurityAction.CHECK_CONFLICTS;
    const { namespace, objects } = params;
    this.assertObjectsArrayNotEmpty(objects, action);

    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const typesAndSpaces = new Map<string, Set<string>>();
    for (const obj of params.objects) {
      typesAndSpaces.set(obj.type, new Set([namespaceString])); // Always enforce authZ for the active space
    }

    return this.authorize({
      actions: new Set([SecurityAction.CHECK_CONFLICTS]),
      types: new Set(typesAndSpaces.keys()),
      spaces: new Set([namespaceString]), // Always check authZ for the active space
      enforceMap: typesAndSpaces,
      // auditing is intentionally bypassed, this function in the previous Security SOC wrapper implementation
      // did not have audit logging. This is primarily because it is only used by Kibana and is not exposed in a
      // public HTTP API
      auditOptions: { bypass: 'always' },
    });
  }

  async authorizeRemoveReferences<A extends string>(
    params: AuthorizeDeleteParams
  ): Promise<CheckAuthorizationResult<A>> {
    // TODO: Improve authorization and auditing (https://github.com/elastic/kibana/issues/135259)
    const { namespace, object } = params;
    const spaces = new Set([SavedObjectsUtils.namespaceIdToString(namespace)]); // Always check/enforce authZ for the active space
    return this.authorize({
      actions: new Set([SecurityAction.REMOVE_REFERENCES]),
      types: new Set([object.type]),
      spaces,
      enforceMap: new Map([[object.type, spaces]]),
      auditOptions: { objects: [object] },
    });
  }

  async authorizeOpenPointInTime<A extends string>(
    params: AuthorizeOpenPointInTimeParams
  ): Promise<CheckAuthorizationResult<A>> {
    const { namespaces, types } = params;

    const preAuthorizationResult = await this.authorize({
      actions: new Set([SecurityAction.OPEN_POINT_IN_TIME]),
      types,
      spaces: namespaces,
      // No need to bypass in audit options - enforce is completely bypassed (no enforce map)
    });

    if (preAuthorizationResult?.status === 'unauthorized') {
      // If the user is unauthorized to find *anything* they requested, throw
      this.addAuditEvent({
        action: AuditAction.OPEN_POINT_IN_TIME,
        error: new Error('User is unauthorized for any requested types/spaces'),
        unauthorizedTypes: [...types],
        unauthorizedSpaces: [...namespaces],
      });
      throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('unauthorized'));
    }
    this.addAuditEvent({
      action: AuditAction.OPEN_POINT_IN_TIME,
      outcome: 'unknown',
    });

    return preAuthorizationResult;
  }

  auditClosePointInTime() {
    this.addAuditEvent({
      action: AuditAction.CLOSE_POINT_IN_TIME,
      outcome: 'unknown',
    });
  }

  async authorizeAndRedactMultiNamespaceReferences(
    params: AuthorizeAndRedactMultiNamespaceReferencesParams
  ): Promise<SavedObjectReferenceWithContext[]> {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(params.namespace);
    const { objects, options = {} } = params;
    if (objects.length === 0) return objects;
    const { purpose } = options;

    // Check authorization based on all *found* object types / spaces
    const typesToAuthorize = new Set<string>();
    const spacesToAuthorize = new Set<string>([namespaceString]);
    const addSpacesToAuthorize = (spaces: string[] = []) => {
      for (const space of spaces) spacesToAuthorize.add(space);
    };
    for (const obj of objects) {
      typesToAuthorize.add(obj.type);
      addSpacesToAuthorize(obj.spaces);
      addSpacesToAuthorize(obj.spacesWithMatchingAliases);
      addSpacesToAuthorize(obj.spacesWithMatchingOrigins);
    }
    const action =
      purpose === 'updateObjectsSpaces'
        ? SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES
        : SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES;

    // Enforce authorization based on all *requested* object types and the current space
    const typesAndSpaces = objects.reduce(
      (acc, { type }) => (acc.has(type) ? acc : acc.set(type, new Set([namespaceString]))), // Always enforce authZ for the active space
      new Map<string, Set<string>>()
    );

    const { typeMap } = (await this.authorize({
      actions: new Set([action]),
      types: typesToAuthorize,
      spaces: spacesToAuthorize,
      enforceMap: typesAndSpaces,
      auditOptions: { bypass: 'on_success' }, // We will audit success results below, after redaction
    })) ?? { typeMap: new Map() };

    // Now, filter/redact the results. Most SOR functions just redact the `namespaces` field from each returned object. However, this function
    // will actually filter the returned object graph itself.
    // This is done in two steps: (1) objects which the user can't access *in this space* are filtered from the graph, and the
    // graph is rearranged to avoid leaking information. (2) any spaces that the user can't access are redacted from each individual object.
    // After we finish filtering, we can write audit events for each object that is going to be returned to the user.
    const requestedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const retrievedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const traversedObjects = new Set<string>();
    const filteredObjectsMap = new Map<string, WithAuditName<SavedObjectReferenceWithContext>>();
    const getIsAuthorizedForInboundReference = (inbound: { type: string; id: string }) => {
      const found = filteredObjectsMap.get(`${inbound.type}:${inbound.id}`);
      return found && !found.isMissing; // If true, this object can be linked back to one of the requested objects
    };
    let objectsToProcess = [...objects];
    while (objectsToProcess.length > 0) {
      const obj = objectsToProcess.shift()!;
      const { type, id, spaces, inboundReferences, name } = obj;
      const objKey = `${type}:${id}`;
      traversedObjects.add(objKey);
      // Is the user authorized to access this object in this space?
      let isAuthorizedForObject = true;
      try {
        this.enforceAuthorization({
          typesAndSpaces: new Map([[type, new Set([namespaceString])]]),
          action,
          typeMap,
          auditOptions: { bypass: 'always' }, // never audit here
        });
      } catch (err) {
        isAuthorizedForObject = false;
      }
      // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
      const redactedInboundReferences = inboundReferences.filter((inbound) => {
        if (inbound.type === type && inbound.id === id) {
          // circular reference, don't redact it
          return true;
        }
        return getIsAuthorizedForInboundReference(inbound);
      });
      // If the user is not authorized to access at least one inbound reference of this object, then we should omit this object.
      const isAuthorizedForGraph =
        requestedObjectsSet.has(objKey) || // If true, this is one of the requested objects, and we checked authorization above
        redactedInboundReferences.some(getIsAuthorizedForInboundReference);

      if (isAuthorizedForObject && isAuthorizedForGraph) {
        if (spaces.length) {
          // Only generate success audit records for "non-empty results" with 1+ spaces
          // ("empty result" means the object was a non-multi-namespace type, or hidden type, or not found)
          this.addAuditEvent({
            action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
            savedObject: { type, id, name },
          });
        }
        filteredObjectsMap.set(objKey, obj);
      } else if (!isAuthorizedForObject && isAuthorizedForGraph) {
        filteredObjectsMap.set(objKey, { ...obj, spaces: [], isMissing: true });
      } else if (isAuthorizedForObject && !isAuthorizedForGraph) {
        const hasUntraversedInboundReferences = inboundReferences.some(
          (ref) =>
            !traversedObjects.has(`${ref.type}:${ref.id}`) &&
            retrievedObjectsSet.has(`${ref.type}:${ref.id}`)
        );

        if (hasUntraversedInboundReferences) {
          // this object has inbound reference(s) that we haven't traversed yet; bump it to the back of the list
          objectsToProcess = [...objectsToProcess, obj];
        } else {
          // There should never be a missing inbound reference.
          // If there is, then something has gone terribly wrong.
          const missingInboundReference = inboundReferences.find(
            (ref) =>
              !traversedObjects.has(`${ref.type}:${ref.id}`) &&
              !retrievedObjectsSet.has(`${ref.type}:${ref.id}`)
          );

          if (missingInboundReference) {
            throw new Error(
              `Unexpected inbound reference to "${missingInboundReference.type}:${missingInboundReference.id}"`
            );
          }
        }
      }
    }

    const filteredAndRedactedObjects = [
      ...filteredObjectsMap.values(),
    ].map<SavedObjectReferenceWithContext>((obj) => {
      const {
        type,
        id,
        spaces,
        spacesWithMatchingAliases,
        spacesWithMatchingOrigins,
        inboundReferences,
      } = obj;
      // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
      const redactedInboundReferences = inboundReferences.filter((inbound) => {
        if (inbound.type === type && inbound.id === id) {
          // circular reference, don't redact it
          return true;
        }
        return getIsAuthorizedForInboundReference(inbound);
      });

      /** Simple wrapper for the `redactNamespaces` function that expects a saved object in its params. */
      const getRedactedSpaces = (spacesArray: string[] | undefined) => {
        if (!spacesArray) return;
        const savedObject = { type, namespaces: spacesArray } as SavedObject; // Other SavedObject attributes aren't required
        const result = this.redactNamespaces({ savedObject, typeMap });
        return result.namespaces;
      };
      const redactedSpaces = getRedactedSpaces(spaces)!;
      const redactedSpacesWithMatchingAliases = getRedactedSpaces(spacesWithMatchingAliases);
      const redactedSpacesWithMatchingOrigins = getRedactedSpaces(spacesWithMatchingOrigins);
      const { name, ...normalizedObject } = obj;

      return {
        ...normalizedObject,
        spaces: redactedSpaces,
        ...(redactedSpacesWithMatchingAliases && {
          spacesWithMatchingAliases: redactedSpacesWithMatchingAliases,
        }),
        ...(redactedSpacesWithMatchingOrigins && {
          spacesWithMatchingOrigins: redactedSpacesWithMatchingOrigins,
        }),
        inboundReferences: redactedInboundReferences,
      };
    });

    return filteredAndRedactedObjects;
  }

  async authorizeAndRedactInternalBulkResolve<T = unknown>(
    params: AuthorizeAndRedactInternalBulkResolveParams<T>
  ): Promise<Array<SavedObjectsResolveResponse<T> | BulkResolveError>> {
    const { namespace, objects } = params;
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>();
    const auditableObjects: SavedObjectAudit[] = [];

    for (const result of objects) {
      let auditableObject: SavedObjectAudit | undefined;
      if (isBulkResolveError(result)) {
        const { type, id, error } = result;
        if (!SavedObjectsErrorHelpers.isBadRequestError(error)) {
          // Only "not found" errors should show up as audit events (not "unsupported type" errors)
          auditableObject = { type, id };
        }
      } else {
        const {
          type,
          id,
          name,
          namespaces = [],
        } = (result as SavedObjectsResolveResponse).saved_object as SavedObjectWithName;
        auditableObject = { type, id, name };
        for (const space of namespaces) {
          spacesToAuthorize.add(space);
        }
      }
      if (auditableObject) {
        auditableObjects.push(auditableObject);
        const spacesToEnforce =
          typesAndSpaces.get(auditableObject.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
        spacesToEnforce.add(namespaceString);
        typesAndSpaces.set(auditableObject.type, spacesToEnforce);
        spacesToAuthorize.add(namespaceString);
      }
    }

    if (typesAndSpaces.size === 0) {
      // We only had "unsupported type" errors, there are no types to check privileges for, just return early
      return objects;
    }

    const { typeMap } = await this.authorize({
      actions: new Set([SecurityAction.INTERNAL_BULK_RESOLVE]),
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      enforceMap: typesAndSpaces,
      auditOptions: { objects: auditableObjects, useSuccessOutcome: true },
    });

    return objects.map((result) => {
      if (isBulkResolveError(result)) {
        return result;
      }

      const { name, ...normalizedSavedObject } = result.saved_object as SavedObjectWithName<T>;

      return {
        ...result,
        saved_object: this.redactNamespaces({
          typeMap,
          savedObject: normalizedSavedObject,
        }),
      };
    });
  }

  async authorizeUpdateSpaces<A extends string>(
    params: AuthorizeUpdateSpacesParams
  ): Promise<CheckAuthorizationResult<A>> {
    const action = SecurityAction.UPDATE_OBJECTS_SPACES;
    const { objects, spacesToAdd, spacesToRemove } = params;
    this.assertObjectsArrayNotEmpty(objects, action);

    const namespaceString = SavedObjectsUtils.namespaceIdToString(params.namespace);
    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>();
    for (const obj of objects) {
      const { type, existingNamespaces } = obj;

      const spacesToEnforce =
        typesAndSpaces.get(type) ?? new Set([...spacesToAdd, ...spacesToRemove, namespaceString]); // Always enforce authZ for the active space
      typesAndSpaces.set(type, spacesToEnforce);

      for (const space of spacesToEnforce) {
        spacesToAuthorize.add(space);
      }

      for (const space of existingNamespaces) {
        // Existing namespaces are included so we can later redact if necessary
        // If this is a specific space, add it to the spaces we'll check privileges for (don't accidentally check for global privileges)
        if (space === ALL_NAMESPACES_STRING) continue;
        spacesToAuthorize.add(space);
      }
    }

    const addToSpaces = spacesToAdd.length ? spacesToAdd : undefined;
    const deleteFromSpaces = spacesToRemove.length ? spacesToRemove : undefined;
    return await this.authorize({
      // If a user tries to share/unshare an object to/from '*', they need to have 'share_to_space' privileges for the Global Resource
      // (e.g., All privileges for All Spaces).
      actions: new Set([SecurityAction.UPDATE_OBJECTS_SPACES]),
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      enforceMap: typesAndSpaces,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces,
        deleteFromSpaces,
      },
    });
  }

  async authorizeFind<A extends string>(
    params: AuthorizeFindParams
  ): Promise<CheckAuthorizationResult<A>> {
    const { types, namespaces } = params;

    const preAuthorizationResult = await this.authorize({
      actions: new Set([SecurityAction.FIND]),
      types,
      spaces: namespaces,
    });
    if (preAuthorizationResult?.status === 'unauthorized') {
      // If the user is unauthorized to find *anything* they requested, audit but don't throw
      // This is one of the last remaining calls to addAuditEvent outside of the sec ext
      this.addAuditEvent({
        action: AuditAction.FIND,
        error: new Error(`User is unauthorized for any requested types/spaces`),
        unauthorizedTypes: [...types],
        unauthorizedSpaces: [...namespaces],
      });
    }
    return preAuthorizationResult;
  }

  async getFindRedactTypeMap<A extends string>(
    params: GetFindRedactTypeMapParams
  ): Promise<AuthorizationTypeMap<A> | undefined> {
    const { previouslyCheckedNamespaces: authorizeNamespaces, objects } = params;

    const spacesToAuthorize = new Set<string>(authorizeNamespaces); // only for namespace redaction
    for (const { type, id, existingNamespaces } of objects) {
      for (const space of existingNamespaces) {
        spacesToAuthorize.add(space);
      }
      this.addAuditEvent({
        action: AuditAction.FIND,
        savedObject: { type, id },
      });
    }
    if (spacesToAuthorize.size > authorizeNamespaces.size) {
      // If there are any namespaces in the object results that were not already checked during pre-authorization, we need *another*
      // authorization check so we can correctly redact the object namespaces below.
      const authorizationResult = await this.authorize({
        actions: new Set([SecurityAction.FIND]),
        types: new Set(objects.map((obj) => obj.type)),
        spaces: spacesToAuthorize,
      });
      return authorizationResult.typeMap;
    }
  }

  async authorizeDisableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]) {
    if (aliases.length === 0) throw new Error(`No aliases specified for authorization`);

    const [uniqueSpaces, typesAndSpaces] = aliases.reduce(
      ([spaces, typesAndSpacesMap], { targetSpace, targetType }) => {
        const spacesForType = typesAndSpacesMap.get(targetType) ?? new Set();
        return [
          spaces.add(targetSpace),
          typesAndSpacesMap.set(targetType, spacesForType.add(targetSpace)),
        ];
      },
      [new Set<string>(), new Map<string, Set<string>>()]
    );

    await this.authorize({
      actions: new Set([SecurityAction.BULK_UPDATE]),
      types: new Set(typesAndSpaces.keys()),
      spaces: uniqueSpaces,
      enforceMap: typesAndSpaces,
      auditOptions: {
        objects: aliases.map((alias) => {
          return {
            type: LEGACY_URL_ALIAS_TYPE,
            id: `${alias.targetSpace}:${alias.targetType}:${alias.sourceId}`,
          };
        }),
      },
    });
  }

  auditObjectsForSpaceDeletion<T>(
    spaceId: string,
    resultObjects: Array<WithAuditName<SavedObjectsFindResult<T>>>
  ) {
    resultObjects.forEach((obj) => {
      const { namespaces = [], id, type, name } = obj;

      const isOnlySpace = namespaces.length === 1; // We can always rely on the `namespaces` field having >=1 element
      if (namespaces.includes(ALL_SPACES_ID) && !namespaces.includes(spaceId)) {
        // This object exists in All Spaces and its `namespaces` field isn't going to change; there's nothing to audit
        return;
      }

      this.addAuditEvent({
        action: isOnlySpace ? AuditAction.DELETE : AuditAction.UPDATE_OBJECTS_SPACES,
        outcome: 'unknown',
        savedObject: { id, type, name },
        ...(!isOnlySpace && { deleteFromSpaces: [spaceId] }),
      });
    });
  }

  getCurrentUser() {
    return this.getCurrentUserFunc();
  }

  includeSavedObjectNames() {
    return this.auditLogger.includeSavedObjectNames;
  }
}

/**
 * The '*' string is an identifier for All Spaces, but that is also the identifier for the Global Resource. We should not check
 * authorization against it unless explicitly specified, because you can only check privileges for the Global Resource *or* individual
 * resources (not both).
 */
function getAuthorizableSpaces(spaces: Set<string>, allowGlobalResource?: boolean) {
  const spacesArray = [...spaces];
  if (allowGlobalResource) return spacesArray;
  return spacesArray.filter((x) => x !== ALL_SPACES_ID);
}

function getMissingPrivileges(privileges: CheckPrivilegesResponse['privileges']) {
  return privileges.kibana.reduce<Map<string | undefined, Set<string>>>(
    (acc, { resource, privilege, authorized }) => {
      if (!authorized) {
        if (resource) {
          acc.set(resource, (acc.get(resource) || new Set()).add(privilege));
        }
        // Fail-secure: if a user is not authorized for a specific resource, they are not authorized for the global resource too (global resource is undefined)
        // The inverse is not true; if a user is not authorized for the global resource, they may still be authorized for a specific resource
        acc.set(undefined, (acc.get(undefined) || new Set()).add(privilege));
      }
      return acc;
    },
    new Map()
  );
}

/**
 * Utility function to sort potentially redacted namespaces.
 * Sorts in a case-insensitive manner, and ensures that redacted namespaces ('?') always show up at the end of the array.
 */
function namespaceComparator(a: string, b: string) {
  if (a === UNKNOWN_SPACE && b !== UNKNOWN_SPACE) {
    return 1;
  } else if (a !== UNKNOWN_SPACE && b === UNKNOWN_SPACE) {
    return -1;
  }
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  return A > B ? 1 : A < B ? -1 : 0;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, SavedObjectsClient } from '@kbn/core/server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type {
  ISavedObjectsSecurityExtension,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import type { AuditLogger, AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type {
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  ISpacesClient,
  Space,
} from '@kbn/spaces-plugin/server';

import { SpaceAuditAction, spaceAuditEvent } from '../audit';
import type { SecurityPluginSetup } from '../plugin';

const PURPOSE_PRIVILEGE_MAP: Record<
  GetAllSpacesPurpose,
  (authorization: SecurityPluginSetup['authz']) => string[]
> = {
  any: (authorization) => [authorization.actions.login],
  copySavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'copyIntoSpace'),
  ],
  findSavedObjects: (authorization) => {
    return [authorization.actions.login, authorization.actions.savedObject.get('config', 'find')];
  },
  shareSavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'shareIntoSpace'),
  ],
};

/** @internal */
export const LEGACY_URL_ALIAS_TYPE = 'legacy-url-alias';

export class SecureSpacesClientWrapper implements ISpacesClient {
  private readonly useRbac: boolean;

  constructor(
    private readonly spacesClient: ISpacesClient,
    private readonly request: KibanaRequest,
    private readonly authorization: AuthorizationServiceSetup,
    private readonly auditLogger: AuditLogger,
    private readonly errors: SavedObjectsClient['errors'],
    private readonly securityExtension: ISavedObjectsSecurityExtension | undefined,
    private readonly getTypeRegistry: () => Promise<ISavedObjectTypeRegistry>
  ) {
    this.useRbac = this.authorization.mode.useRbacForRequest(this.request);
  }

  public async getAll({
    purpose = 'any',
    includeAuthorizedPurposes,
  }: GetAllSpacesOptions = {}): Promise<GetSpaceResult[]> {
    const allSpaces = await this.spacesClient.getAll({ purpose, includeAuthorizedPurposes });

    if (!this.useRbac) {
      allSpaces.forEach(({ id }) =>
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.FIND,
            savedObject: { type: 'space', id },
          })
        )
      );

      return allSpaces;
    }

    const spaceIds = allSpaces.map((space: Space) => space.id);

    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);

    // Collect all privileges which need to be checked
    const allPrivileges = Object.entries(PURPOSE_PRIVILEGE_MAP).reduce(
      (acc, [getSpacesPurpose, privilegeFactory]) => {
        if (!includeAuthorizedPurposes && getSpacesPurpose !== purpose) {
          return acc;
        }
        acc[getSpacesPurpose as GetAllSpacesPurpose] = privilegeFactory(this.authorization);
        return acc;
      },
      {} as Record<GetAllSpacesPurpose, string[]>
    );

    // Check all privileges against all spaces
    const { privileges } = await checkPrivileges.atSpaces(spaceIds, {
      kibana: Object.values(allPrivileges).flat(),
    });

    // Determine which purposes the user is authorized for within each space.
    // Remove any spaces for which user is fully unauthorized.
    const checkHasAllRequired = (space: Space, actions: string[]) =>
      actions.every((action) =>
        privileges.kibana.some(
          ({ resource, privilege, authorized }) =>
            resource === space.id && privilege === action && authorized
        )
      );
    const authorizedSpaces: GetSpaceResult[] = allSpaces
      .map((space: Space) => {
        if (!includeAuthorizedPurposes) {
          // Check if the user is authorized for a single purpose
          const requiredActions = PURPOSE_PRIVILEGE_MAP[purpose](this.authorization);
          return checkHasAllRequired(space, requiredActions) ? space : null;
        }

        // Check if the user is authorized for each purpose
        let hasAnyAuthorization = false;
        const authorizedPurposes = Object.entries(PURPOSE_PRIVILEGE_MAP).reduce(
          (acc, [purposeKey, privilegeFactory]) => {
            const requiredActions = privilegeFactory(this.authorization);
            const hasAllRequired = checkHasAllRequired(space, requiredActions);
            hasAnyAuthorization = hasAnyAuthorization || hasAllRequired;
            acc[purposeKey as GetAllSpacesPurpose] = hasAllRequired;
            return acc;
          },
          {} as Record<GetAllSpacesPurpose, boolean>
        );

        if (!hasAnyAuthorization) {
          return null;
        }
        return { ...space, authorizedPurposes };
      })
      .filter(this.filterUnauthorizedSpaceResults);

    if (authorizedSpaces.length === 0) {
      const error = Boom.forbidden();

      this.auditLogger.log(
        spaceAuditEvent({
          action: SpaceAuditAction.FIND,
          error,
        })
      );

      throw error; // Note: there is a catch for this in `SpacesSavedObjectsClient.find`; if we get rid of this error, remove that too
    }

    authorizedSpaces.forEach(({ id }) =>
      this.auditLogger.log(
        spaceAuditEvent({
          action: SpaceAuditAction.FIND,
          savedObject: { type: 'space', id },
        })
      )
    );

    return authorizedSpaces;
  }

  public async get(id: string) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedAtSpace(
          id,
          this.authorization.actions.login,
          `Unauthorized to get ${id} space`
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.GET,
            savedObject: { type: 'space', id },
            error,
          })
        );
        throw error;
      }
    }

    const space = this.spacesClient.get(id);

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.GET,
        savedObject: { type: 'space', id },
      })
    );

    return space;
  }

  public async create(space: Space) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
          'Unauthorized to create spaces'
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.CREATE,
            savedObject: { type: 'space', id: space.id },
            error,
          })
        );
        throw error;
      }
    }

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'space', id: space.id },
      })
    );

    return this.spacesClient.create(space);
  }

  public async update(id: string, space: Space) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
          'Unauthorized to update spaces'
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.UPDATE,
            savedObject: { type: 'space', id },
            error,
          })
        );
        throw error;
      }
    }

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.UPDATE,
        outcome: 'unknown',
        savedObject: { type: 'space', id },
      })
    );

    return this.spacesClient.update(id, space);
  }

  public createSavedObjectFinder(id: string) {
    return this.spacesClient.createSavedObjectFinder(id);
  }

  public async delete(id: string) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
          'Unauthorized to delete spaces'
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.DELETE,
            savedObject: { type: 'space', id },
            error,
          })
        );
        throw error;
      }
    }

    // Fetch saved objects to be removed for audit logging
    // If RBAC is enabled, the securityExtension should definitely be defined, but we check just in case
    const securityExtension = this.securityExtension;
    if (this.auditLogger.enabled && securityExtension !== undefined) {
      const finder = this.spacesClient.createSavedObjectFinder(id);
      try {
        const registry = await this.getTypeRegistry();

        for await (const response of finder.find()) {
          const auditObjects = response.saved_objects.map((obj) => ({
            ...obj,
            name: SavedObjectsUtils.getName(registry.getNameAttribute(obj.type), obj),
          }));
          this.securityExtension?.auditObjectsForSpaceDeletion(id, auditObjects);
        }
      } finally {
        await finder.close();
      }
    }

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: { type: 'space', id },
      })
    );

    return this.spacesClient.delete(id);
  }

  public async disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]) {
    try {
      await this.securityExtension?.authorizeDisableLegacyUrlAliases(aliases); // will throw if unauthorized
    } catch (err) {
      throw this.errors.decorateForbiddenError(
        new Error(`Unable to disable aliases: ${err.message}`)
      );
    }
    return this.spacesClient.disableLegacyUrlAliases(aliases);
  }

  private async ensureAuthorizedGlobally(action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { hasAllRequested } = await checkPrivileges.globally({ kibana: action });

    if (!hasAllRequested) {
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private async ensureAuthorizedAtSpace(spaceId: string, action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { hasAllRequested } = await checkPrivileges.atSpace(spaceId, {
      kibana: action,
    });

    if (!hasAllRequested) {
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private filterUnauthorizedSpaceResults(value: GetSpaceResult | null): value is GetSpaceResult {
    return value !== null;
  }
}

/** @internal This is only exported for testing purposes. */
export function getAliasId({ targetSpace, targetType, sourceId }: LegacyUrlAliasTarget) {
  return `${targetSpace}:${targetType}:${sourceId}`;
}

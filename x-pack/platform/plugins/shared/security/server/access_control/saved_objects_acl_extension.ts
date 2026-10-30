/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { AclChangeError, type AclObjectDecision } from '@kbn/access-control';
import type { AclObject, ISavedObjectsAclExtension } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getAclObjectKey } from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';

import { runInAuditScope } from './audit';
import type { ScopedAclService } from './scoped_acl_service';

/**
 * Saved Objects ACL extension, built on the request's object-level security service. When object-level
 * security is disabled by configuration, the service allows every object and adds no filters, while
 * Core keeps preserving stored ACLs.
 */
export class SavedObjectsAclExtension implements ISavedObjectsAclExtension {
  constructor(private readonly aclService: ScopedAclService) {}

  public async getReadFilters({ namespacesByType }: { namespacesByType: Map<string, string[]> }) {
    const filters = new Map<string, estypes.QueryDslQueryContainer>();
    for (const [type, namespaces] of namespacesByType) {
      const filter = await this.aclService.getReadFilter({ type, spaceIds: namespaces });
      if (filter) {
        filters.set(type, filter);
      }
    }
    return filters;
  }

  public async authorizeObjects({
    operation,
    namespace,
    objects,
  }: {
    operation: string;
    namespace?: string;
    objects: AclObject[];
  }) {
    const spaceId = SavedObjectsUtils.namespaceIdToString(namespace);
    const decisions = new Map<string, AclObjectDecision>();
    for (const type of new Set(objects.map((object) => object.type))) {
      const typeDecisions = await this.aclService.authorize({
        type,
        spaceId,
        operation,
        objects: objects.filter((object) => object.type === type),
      });
      typeDecisions.forEach((decision, id) => decisions.set(getAclObjectKey(type, id), decision));
    }
    return decisions;
  }

  public async getInitialAcl({
    type,
    namespace,
    requested,
  }: Parameters<ISavedObjectsAclExtension['getInitialAcl']>[0]) {
    try {
      return await this.aclService.getInitialAcl({
        type,
        spaceId: SavedObjectsUtils.namespaceIdToString(namespace),
        requested,
      });
    } catch (error) {
      throw toSavedObjectsError(error, type);
    }
  }

  public async authorizeAclChange({
    namespace,
    object: { type, id, acl },
    change,
  }: Parameters<ISavedObjectsAclExtension['authorizeAclChange']>[0]) {
    try {
      return await this.aclService.authorizeChange({
        type,
        id,
        spaceId: SavedObjectsUtils.namespaceIdToString(namespace),
        acl,
        change,
      });
    } catch (error) {
      throw toSavedObjectsError(error, type, id);
    }
  }

  public async runInAuditScope<T>(operation: () => Promise<T>) {
    return await runInAuditScope(operation);
  }
}

const toSavedObjectsError = (error: Error, type: string, id?: string) => {
  if (!(error instanceof AclChangeError)) {
    return error;
  }

  switch (error.code) {
    case 'forbidden':
      return SavedObjectsErrorHelpers.decorateForbiddenError(error);
    case 'conflict':
      return id
        ? SavedObjectsErrorHelpers.createConflictError(type, id, error.message)
        : SavedObjectsErrorHelpers.decorateConflictError(error);
    default:
      return SavedObjectsErrorHelpers.createBadRequestError(error.message);
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { SingleCaseMetricsResponse } from '../../../../common/types/api';
import type { UnifiedAttachmentAttributes } from '../../../common/types/attachments_v2';

const USER_ENTITY_TYPE = 'user';
const HOST_ENTITY_TYPE = 'host';

export interface EntityAssociatedNames {
  /** Unique user entity display names (`metadata.entityName`). */
  userNames: Set<string>;
  /** Host entity display name → attachment id (EUID), keyed by `metadata.entityName`. */
  hostsByName: Map<string, string>;
}

/**
 * Collects unique user/host display names from `security.entity` attachments.
 * Service and generic entity types are ignored.
 */
export const collectEntityAssociatedNames = (
  attachments: Array<SavedObject<UnifiedAttachmentAttributes>>
): EntityAssociatedNames => {
  const userNames = new Set<string>();
  const hostsByName = new Map<string, string>();

  for (const { attributes } of attachments) {
    if (attributes.type === SECURITY_ENTITY_ATTACHMENT_TYPE) {
      const metadata = attributes.metadata;
      if (metadata != null && typeof metadata === 'object') {
        const entityType = metadata.entityType;
        const entityName = metadata.entityName;
        if (
          typeof entityType === 'string' &&
          typeof entityName === 'string' &&
          entityName.length > 0
        ) {
          if (entityType === USER_ENTITY_TYPE) {
            userNames.add(entityName);
          } else if (entityType === HOST_ENTITY_TYPE && 'attachmentId' in attributes) {
            const rawAttachmentId = attributes.attachmentId;
            const attachmentId = Array.isArray(rawAttachmentId)
              ? rawAttachmentId[0]
              : rawAttachmentId;
            if (
              typeof attachmentId === 'string' &&
              attachmentId.length > 0 &&
              !hostsByName.has(entityName)
            ) {
              // First attachment wins for id when duplicate names appear.
              hostsByName.set(entityName, attachmentId);
            }
          }
        }
      }
    }
  }

  return { userNames, hostsByName };
};

/**
 * Unions alert-derived associated users/hosts with entity attachment display names.
 * `total` accounts for alert cardinalities that may exceed the top-N `values` list.
 */
export const mergeAlertMetricsWithEntityNames = (
  metrics: SingleCaseMetricsResponse,
  entityNames: EntityAssociatedNames
): SingleCaseMetricsResponse => {
  const { userNames, hostsByName } = entityNames;
  if (userNames.size === 0 && hostsByName.size === 0) {
    return metrics;
  }

  let result = metrics;

  if (metrics.alerts?.users != null && userNames.size > 0) {
    result = {
      ...result,
      alerts: {
        ...result.alerts,
        users: mergeUsers(metrics.alerts.users, userNames),
      },
    };
  }

  if (metrics.alerts?.hosts != null && hostsByName.size > 0) {
    result = {
      ...result,
      alerts: {
        ...result.alerts,
        hosts: mergeHosts(metrics.alerts.hosts, hostsByName),
      },
    };
  }

  return result;
};

const mergeUsers = (
  users: NonNullable<NonNullable<SingleCaseMetricsResponse['alerts']>['users']>,
  entityUserNames: Set<string>
): NonNullable<NonNullable<SingleCaseMetricsResponse['alerts']>['users']> => {
  const knownNames = new Set(users.values.map((value) => value.name));
  const unknownAlertCount = Math.max(0, users.total - knownNames.size);
  const newNames = [...entityUserNames].filter((name) => !knownNames.has(name));

  return {
    total: knownNames.size + unknownAlertCount + newNames.length,
    values: [
      ...users.values,
      ...newNames.map((name) => ({
        name,
        count: 1,
      })),
    ],
  };
};

const mergeHosts = (
  hosts: NonNullable<NonNullable<SingleCaseMetricsResponse['alerts']>['hosts']>,
  entityHostsByName: Map<string, string>
): NonNullable<NonNullable<SingleCaseMetricsResponse['alerts']>['hosts']> => {
  const knownNames = new Set<string>();
  let hostsWithoutName = 0;

  for (const value of hosts.values) {
    if (typeof value.name === 'string' && value.name.length > 0) {
      knownNames.add(value.name);
    } else {
      hostsWithoutName += 1;
    }
  }

  const knownCount = knownNames.size + hostsWithoutName;
  const unknownAlertCount = Math.max(0, hosts.total - knownCount);
  const newHosts = [...entityHostsByName.entries()].filter(([name]) => !knownNames.has(name));

  return {
    total: knownCount + unknownAlertCount + newHosts.length,
    values: [
      ...hosts.values,
      ...newHosts.map(([name, id]) => ({
        name,
        id,
        count: 1,
      })),
    ],
  };
};

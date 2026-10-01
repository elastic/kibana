/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import type { KueryNode } from '@kbn/es-query';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { ReportingUserIdentity } from '../../../lib';
import type { ScheduledReportType } from '../../../types';

const CREATED_BY_FIELD = `${SCHEDULED_REPORT_SAVED_OBJECT_TYPE}.attributes.createdBy`;
const CREATED_BY_ID_FIELD = `${SCHEDULED_REPORT_SAVED_OBJECT_TYPE}.attributes.createdById`;
const CREATED_BY_API_KEY_ID_FIELD = `${SCHEDULED_REPORT_SAVED_OBJECT_TYPE}.attributes.createdByApiKeyId`;

type ScheduledReportOwnership = Pick<
  ScheduledReportType,
  'createdBy' | 'createdById' | 'createdByApiKeyId'
>;

/** Humans can own reports created through their API keys; keys can own only their own reports. */
export const isScheduledReportOwner = ({
  report,
  currentUser,
}: {
  report: ScheduledReportOwnership;
  currentUser: ReportingUserIdentity;
}): boolean => {
  // Preserve username ownership only for reports created before ownership IDs were recorded.
  if (report.createdById === undefined && report.createdByApiKeyId === undefined) {
    return currentUser.username !== undefined && report.createdBy === currentUser.username;
  }

  if (currentUser.apiKeyId !== undefined) {
    return report.createdByApiKeyId === currentUser.apiKeyId;
  }

  if (report.createdById !== undefined) {
    return report.createdById.some((id) => currentUser.ids.includes(id));
  }

  return false;
};

// Saved-object filters rewrite wildcard `is` nodes to storage fields, but not bare `exists` nodes.
const isAbsent = (field: string): KueryNode =>
  nodeTypes.function.buildNode('not', nodeBuilder.is(field, nodeTypes.wildcard.buildNode('*')));

/** Mirrors isScheduledReportOwner; callers must treat undefined as no access, not an unfiltered search. */
export const buildOwnedByFilter = (currentUser: ReportingUserIdentity): KueryNode | undefined => {
  const { ids, apiKeyId, username } = currentUser;
  const clauses =
    apiKeyId !== undefined
      ? [nodeBuilder.is(CREATED_BY_API_KEY_ID_FIELD, apiKeyId)]
      : ids.map((id) => nodeBuilder.is(CREATED_BY_ID_FIELD, id));

  if (username !== undefined) {
    clauses.push(
      nodeBuilder.and([
        nodeBuilder.is(CREATED_BY_FIELD, username),
        isAbsent(CREATED_BY_ID_FIELD),
        isAbsent(CREATED_BY_API_KEY_ID_FIELD),
      ])
    );
  }

  return clauses.length > 0 ? nodeBuilder.or(clauses) : undefined;
};

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

/**
 * Checks whether the current principal owns a scheduled report.
 *
 * Stable ids are preferred when the report stored a `createdById` (profile uid or realm-qualified
 * id). Username matching is kept only for legacy documents that never stored an id, so those
 * owners are not orphaned after upgrade. That legacy path cannot distinguish same-username
 * principals across realms, which is exactly the vulnerability this id fixes - see `isAgentOwner`
 * in `x-pack/platform/plugins/shared/agent_builder/server/services/agents/access_control/authorization.ts`
 * for the precedent this mirrors.
 */
export const isScheduledReportOwner = ({
  report,
  currentUser,
}: {
  report: Pick<ScheduledReportType, 'createdBy' | 'createdById'>;
  currentUser: ReportingUserIdentity;
}): boolean => {
  if (report.createdById !== undefined) {
    return currentUser.id !== undefined && report.createdById === currentUser.id;
  }
  return currentUser.username !== undefined && report.createdBy === currentUser.username;
};

/**
 * Builds the saved-objects `find` filter restricting results to reports owned by `currentUser`:
 * `createdById == id` OR (`createdBy == username` AND `createdById` is absent).
 *
 * Uses `nodeBuilder.is`, which builds literal nodes for both the field and the value, so values
 * containing `"`, `[`, `]`, or `*` (as realm-qualified ids do) are matched exactly rather than
 * parsed as KQL syntax.
 */
export const buildOwnedByFilter = ({ id, username }: ReportingUserIdentity): KueryNode => {
  const legacyClause = nodeBuilder.and([
    nodeBuilder.is(CREATED_BY_FIELD, username ?? ''),
    nodeTypes.function.buildNode(
      'not',
      nodeBuilder.is(CREATED_BY_ID_FIELD, nodeTypes.wildcard.buildNode('*'))
    ),
  ]);

  if (id === undefined) {
    return legacyClause;
  }

  return nodeBuilder.or([nodeBuilder.is(CREATED_BY_ID_FIELD, id), legacyClause]);
};

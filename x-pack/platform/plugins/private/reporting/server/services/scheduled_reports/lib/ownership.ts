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
 * Username matching applies only to legacy documents that never stored a `createdById`, so their
 * owners are not orphaned after upgrade. It cannot distinguish same-username principals across
 * realms, so it must never be reached for a document that does have an id.
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
 * Returns `undefined` when the identity has neither an id nor a username, so callers fail closed
 * instead of running an unfiltered search.
 */
export const buildOwnedByFilter = ({
  id,
  username,
}: ReportingUserIdentity): KueryNode | undefined => {
  const clauses: KueryNode[] = [];

  if (id !== undefined) {
    clauses.push(nodeBuilder.is(CREATED_BY_ID_FIELD, id));
  }

  if (username !== undefined) {
    clauses.push(
      nodeBuilder.and([
        nodeBuilder.is(CREATED_BY_FIELD, username),
        // `nodeBuilder.exists` cannot be used here: the saved-objects filter validator only
        // rewrites `is`/`range`/`nested` nodes to top-level field names, so an `exists` node
        // would silently query `attributes.createdById`. Negating a wildcard `is` keeps the
        // node type the validator rewrites.
        nodeTypes.function.buildNode(
          'not',
          nodeBuilder.is(CREATED_BY_ID_FIELD, nodeTypes.wildcard.buildNode('*'))
        ),
      ])
    );
  }

  return clauses.length > 0 ? nodeBuilder.or(clauses) : undefined;
};

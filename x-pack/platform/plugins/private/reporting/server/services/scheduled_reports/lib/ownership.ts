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

/** A document predating ownership ids, whose only record of its creator is a username. */
const isLegacyDocument = (report: ScheduledReportOwnership): boolean =>
  report.createdById === undefined && report.createdByApiKeyId === undefined;

const matchesUsername = (
  report: ScheduledReportOwnership,
  { username }: ReportingUserIdentity
): boolean => username !== undefined && report.createdBy === username;

/**
 * Checks whether the current principal owns a scheduled report.
 *
 * Ownership is asymmetric: a human owns what they created through a session or through any of
 * their API keys, while a key owns only what it created, so sharing a key hands over nothing else.
 *
 * Username matching cannot distinguish same-username principals across realms, so it is reached
 * only for a document recording no owner id.
 */
export const isScheduledReportOwner = ({
  report,
  currentUser,
}: {
  report: ScheduledReportOwnership;
  currentUser: ReportingUserIdentity;
}): boolean => {
  if (currentUser.apiKeyId !== undefined) {
    if (report.createdByApiKeyId !== undefined) {
      return report.createdByApiKeyId === currentUser.apiKeyId;
    }
    // A key keeps its access to documents predating key attribution, but must not reach anything
    // created since, which is attributed precisely.
    return isLegacyDocument(report) && matchesUsername(report, currentUser);
  }

  if (report.createdById !== undefined) {
    return report.createdById.some((id) => currentUser.ids.includes(id));
  }

  return isLegacyDocument(report) && matchesUsername(report, currentUser);
};

/**
 * `nodeBuilder.exists` cannot be used here: the saved-objects filter validator only rewrites
 * `is`/`range`/`nested` nodes to top-level field names, so an `exists` node would silently query
 * `attributes.<field>`. Negating a wildcard `is` keeps the node type the validator rewrites.
 */
const isAbsent = (field: string): KueryNode =>
  nodeTypes.function.buildNode('not', nodeBuilder.is(field, nodeTypes.wildcard.buildNode('*')));

/**
 * Builds the saved-objects `find` filter for reports owned by `currentUser`, mirroring
 * `isScheduledReportOwner`.
 *
 * Returns `undefined` when the identity can match nothing, so callers fail closed instead of
 * running an unfiltered search.
 */
export const buildOwnedByFilter = (currentUser: ReportingUserIdentity): KueryNode | undefined => {
  const { ids, apiKeyId, username } = currentUser;
  const clauses: KueryNode[] = [];

  if (apiKeyId !== undefined) {
    clauses.push(nodeBuilder.is(CREATED_BY_API_KEY_ID_FIELD, apiKeyId));

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
  }

  for (const id of ids) {
    clauses.push(nodeBuilder.is(CREATED_BY_ID_FIELD, id));
  }

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

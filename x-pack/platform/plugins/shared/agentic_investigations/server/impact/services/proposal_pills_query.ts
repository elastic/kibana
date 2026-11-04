/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  OPEN_PROPOSAL_STATUSES,
  PROPOSALS_INDEX_NAME,
  SETTLED_PROPOSAL_STATUSES,
} from '@kbn/proposals-common';
import { IMPACT_INDEX_NAME } from '../../../common/impact/constants';
import type { ProposalImpactPillsQuery } from '../../../common/impact/impact_pills';

export interface PillCount {
  entityId: string;
  count: number;
}

export interface PillsPage {
  /** The requested page: `from` rows skipped, at most `size` kept. */
  rows: PillCount[];
  /** Entities over the whole queue. */
  total: number;
}

const EMPTY_PAGE: PillsPage = { rows: [], total: 0 };

const quoted = (values: readonly string[]): string =>
  values.map((value) => `"${value}"`).join(', ');

/** Ranks the entities of the on-page conversations by their proposal count, one page at a time. */
export const queryProposalPills = async ({
  esClient,
  logger,
  spaceId,
  origin,
  categories,
  decidedWithinHours,
  from,
  size,
}: ProposalImpactPillsQuery & {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): Promise<PillsPage> => {
  const categoryParams = categories.map((category, index) => ({ [`category${index}`]: category }));
  const categoryNames = categoryParams.map((param) => `?${Object.keys(param)[0]}`).join(', ');
  const open = `status IN (${quoted(OPEN_PROPOSAL_STATUSES)}) AND category IN (${categoryNames})`;
  const closed =
    decidedWithinHours === undefined
      ? undefined
      : `status IN (${quoted(
          SETTLED_PROPOSAL_STATUSES
        )}) AND decidedAt >= NOW() - ${decidedWithinHours} hours`;
  const inScope = closed ? `(${open}) OR (${closed})` : open;

  const query = `FROM (FROM ${IMPACT_INDEX_NAME} | WHERE spaceId == ?space | KEEP conversationId, entityIds),
    (FROM ${PROPOSALS_INDEX_NAME}
      | WHERE spaceId == ?space AND origin == ?origin AND supersededBy IS NULL AND (${inScope})
      | STATS proposals = COUNT(*) BY conversationId)
  | INLINE STATS weight = SUM(proposals) BY conversationId
  | WHERE entityIds IS NOT NULL AND weight > 0
  | MV_EXPAND entityIds
  | STATS count = SUM(weight) BY entityIds
  | INLINE STATS total = COUNT(*)
  | SORT count DESC, entityIds ASC
  | LIMIT ${from + size}`;

  try {
    const { columns, values } = await esClient.esql.query({
      query,
      params: [{ space: spaceId }, { origin }, ...categoryParams],
      format: 'json',
    });
    const names = columns.map(({ name }) => name);
    const [entityIdIndex, countIndex, totalIndex] = ['entityIds', 'count', 'total'].map((name) =>
      names.indexOf(name)
    );
    const rows = values.slice(from);
    return {
      rows: rows.map((row) => ({
        entityId: String(row[entityIdIndex]),
        count: Number(row[countIndex]),
      })),
      total: Number((values[0] ?? [])[totalIndex] ?? 0),
    };
  } catch (error) {
    if (isMissingIndex(error)) {
      logger.debug(`Impact pills have no data to read yet: ${error}`);
      return EMPTY_PAGE;
    }
    throw error;
  }
};

const isMissingIndex = (error: unknown): boolean => {
  const { statusCode, message } = (error ?? {}) as { statusCode?: number; message?: string };
  return statusCode === 404 || /unknown index|index_not_found/i.test(message ?? '');
};

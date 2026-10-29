/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type {
  QueryAiIndicesRequest,
  QueryAiIndicesResponse,
} from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { getAiIndexDataReadServiceForUser, type AiIndexToolDeps } from '../ai_index_read_service';

/** The KI ids in a result, when the query kept the `id` column. */
export const kiIdsOf = ({ columns, values }: QueryAiIndicesResponse): string[] => {
  const idColumn = columns.findIndex(({ name }) => name === 'id');
  if (idColumn < 0) {
    return [];
  }
  return values.flatMap((row) => {
    const id = row[idColumn];
    return typeof id === 'string' && id.length > 0 ? [id] : [];
  });
};

/**
 * Runs the same code as `POST /api/context_engine/ai_index/_query`, and counts a read of every KI
 * the agent gets back, which is what decides when memory enrichment looks at a KI.
 */
export const queryAiIndicesHandler = async ({
  deps,
  request: queryRequest,
  context: { esClient, request, spaceId, logger },
}: {
  deps: AiIndexToolDeps;
  request: QueryAiIndicesRequest;
  context: Pick<ToolHandlerContext, 'esClient' | 'request' | 'spaceId' | 'logger'>;
}): Promise<QueryAiIndicesResponse> => {
  const readService = await getAiIndexDataReadServiceForUser({ deps, esClient, request });
  const response = await readService.query(queryRequest);
  const kiIds = kiIdsOf(response);
  if (kiIds.length > 0) {
    // Counting is best effort and must not delay or fail the agent's query.
    deps
      .getContextEngineStart()
      .then((contextEngine) => contextEngine.getKiUsageService().recordAccess({ spaceId, kiIds }))
      .catch((error) => {
        logger.debug(
          `Failed to record KI reads: ${error instanceof Error ? error.message : String(error)}`
        );
      });
  }
  return response;
};

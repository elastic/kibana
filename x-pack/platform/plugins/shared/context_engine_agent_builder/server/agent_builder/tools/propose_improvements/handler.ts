/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { IMPROVEMENT_ACTIONS } from '@kbn/context-engine-plugin/common/http_api/improvement_actions';
import type { RecordImprovementsResponse } from '@kbn/context-engine-plugin/common/http_api/improvements';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { ImprovementsServiceApi } from '@kbn/context-engine-plugin/server/improvements/service';
import { recordImprovements } from '@kbn/context-engine-plugin/server/feedback_analysis/record_improvements';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import {
  flattenAiIndexAttachments,
  resolveAiIndexIdFromAttachments,
} from '../ai_index_attachment';

export interface ProposeImprovementsParams {
  aiIndexId?: string;
  improvements: unknown[];
}

export interface ProposeImprovementsResult extends RecordImprovementsResponse {
  aiIndexId: string;
}

/**
 * Records what an agent proposed in conversation, for the same review queue a scheduled analysis
 * writes to.
 *
 * Proposing rather than applying is the whole point. The agent has the user in front of it and
 * could often just make the change, but a suggestion that goes through review is one a second
 * person can weigh, that says why it was made, and that can be turned down with a reason the next
 * analysis run reads back. Applying directly would leave none of that behind.
 *
 * The write goes through the same {@link recordImprovements} the analysis workflow step uses, so
 * the AI index's `allowed_actions` policy, the derived identity, and the de-duplication behave
 * identically whichever end proposed the change.
 */
export const proposeImprovementsHandler = async ({
  params,
  request,
  spaceId,
  attachments,
  toolCallId,
  esClient,
  logger,
  getAiIndexService,
  getImprovementsService,
  getCoreStart,
  getSecurityStart,
}: {
  params: ProposeImprovementsParams;
  request: KibanaRequest;
  spaceId: string;
  attachments: AttachmentStateManager;
  /** Stands in for a run id: a tool handler is not told which conversation it is running in. */
  toolCallId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  getImprovementsService: (esClient: ElasticsearchClient) => Promise<ImprovementsServiceApi>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): Promise<ProposeImprovementsResult> => {
  await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

  const aiIndexId = resolveAiIndexIdFromAttachments(
    flattenAiIndexAttachments(attachments),
    params.aiIndexId
  );

  // Read back rather than taken on trust: the policy belongs to the index, and an agent briefed
  // before it changed must not be able to propose under the old one.
  const aiIndexService = await getAiIndexService();
  const { feedback_analysis: feedbackAnalysis } = await aiIndexService.get(aiIndexId);
  const allowedActions = feedbackAnalysis?.allowed_actions ?? [...IMPROVEMENT_ACTIONS];

  const result = await recordImprovements({
    aiIndexId,
    source: { origin: 'conversation', agentRunId: toolCallId },
    allowedActions,
    proposals: params.improvements,
    improvementsService: await getImprovementsService(esClient),
  });

  logger.debug(
    () =>
      `Conversation proposed improvements for AI index '${aiIndexId}': recorded ${result.recorded.length}, skipped ${result.skipped.length}`
  );

  return { aiIndexId, ...result };
};

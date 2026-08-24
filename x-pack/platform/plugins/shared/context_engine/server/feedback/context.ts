/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { resolveFeedbackAgentId } from '../../common/feedback_loop/agent';
import { buildFeedbackLoopPrompt } from '../../common/feedback_loop/prompt';
import { MAX_IMPROVEMENT_HISTORY, MAX_SIGNAL_GROUPS } from '../../common/constants';
import type { FeedbackContext } from '../../common/http_api/feedback_loop';
import { buildSignalsIndexName } from '../../common/http_api/signals';
import type { AiIndexService } from '../ai_indices/service';
import { getKiSummary } from '../ai_indices/ki_summary';
import type { ImprovementsServiceApi } from '../improvements/service';
import { getSignalGroups } from '../signals/read';

/**
 * Assembles everything the feedback agent is given about an AI index on a run: its configuration,
 * how many Knowledge Indicators it holds, what the signals say, and every suggestion already made
 * for it. Both the scheduled workflow and the interactive hand-off go through here, so an automatic
 * run and a manual one can never disagree about what the agent was told.
 *
 * The Knowledge Indicators and signals are read on the caller's client, so the context never exposes
 * more of the user's data than they can already see. The suggestion history comes from the
 * plugin-owned improvements store, which only the internal user has privileges on.
 */
export const assembleFeedbackContext = async ({
  esClient,
  aiIndexService,
  improvementsService,
  aiIndexId,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  aiIndexService: AiIndexService;
  improvementsService: ImprovementsServiceApi;
  aiIndexId: string;
  spaceId: string;
}): Promise<FeedbackContext> => {
  const aiIndex = await aiIndexService.get(aiIndexId);
  const signalsIndex = buildSignalsIndexName(spaceId);

  const [kiSummary, signalGroups, improvements] = await Promise.all([
    getKiSummary(esClient, aiIndex.dest.value),
    getSignalGroups(esClient, { spaceId, maxGroups: MAX_SIGNAL_GROUPS }),
    improvementsService.history(spaceId, { aiIndexId, size: MAX_IMPROVEMENT_HISTORY }),
  ]);

  const context = {
    ai_index: aiIndex,
    ki_summary: { count: kiSummary.count, counts_by_type: kiSummary.countsByType },
    signal_groups: signalGroups.groups,
    improvements,
    signals_index: signalsIndex,
    agent_id: resolveFeedbackAgentId(aiIndex.feedback_agent_id),
  };

  return { ...context, prompt: buildFeedbackLoopPrompt(context) };
};

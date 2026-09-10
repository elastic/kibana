/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { KI_SUMMARY_PAGE_SIZE } from '../../common/constants';
import type { FeedbackAnalysisContext } from '../../common/http_api/feedback_context';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import { buildImprovementsJsonSchema } from '../../common/http_api/improvements_output_schema';
import { getKis } from '../ai_indices/ki_list';
import type { AiIndexService } from '../ai_indices/service';
import type { ImprovementsServiceApi } from '../improvements/service';
import { renderBriefing } from './briefing';
import { rankPatterns } from './group_signals';
import { selectSignals } from './select_signals';

export interface BuildFeedbackContextDeps {
  /** Request-scoped client, authorized against the caller. */
  esClient: ElasticsearchClient;
  aiIndexService: AiIndexService;
  improvementsService: ImprovementsServiceApi;
}

/** Assembles everything one analysis run reads. */
export const buildFeedbackContext = async (
  aiIndexId: string,
  { esClient, aiIndexService, improvementsService }: BuildFeedbackContextDeps,
  { now }: { now?: Date } = {}
): Promise<FeedbackAnalysisContext> => {
  const aiIndex = await aiIndexService.get(aiIndexId);
  const feedbackAnalysis = aiIndex.feedback_analysis;

  const allowedActions: ImprovementAction[] = feedbackAnalysis?.allowed_actions ?? [
    ...IMPROVEMENT_ACTIONS,
  ];
  const agentId = feedbackAnalysis?.agent_id ?? agentBuilderDefaultAgentId;

  const [selection, kiList, history] = await Promise.all([
    selectSignals(esClient, {
      destValue: aiIndex.dest.value,
      sources: aiIndex.sources,
      signalTimeRange: feedbackAnalysis?.signal_time_range,
      signalFilter: feedbackAnalysis?.signal_filter,
      ...(now ? { now } : {}),
    }),
    getKis(esClient, { destValue: aiIndex.dest.value, size: KI_SUMMARY_PAGE_SIZE }),
    improvementsService.historySummaryFor(aiIndexId),
  ]);

  const groups = rankPatterns(selection.patterns);
  const run = {
    signal_window: selection.window,
    signal_spaces: selection.spaces,
    signal_count: selection.signalCount,
  };

  return {
    agent_id: agentId,
    run,
    briefing: renderBriefing({
      aiIndex,
      run,
      groups,
      kiSummary: kiList.summary,
      history,
      allowedActions,
    }),
    output_schema: buildImprovementsJsonSchema(allowedActions),
    has_signals: groups.length > 0,
  };
};

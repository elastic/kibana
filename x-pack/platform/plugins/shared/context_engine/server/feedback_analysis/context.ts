/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  KI_SUMMARY_PAGE_SIZE,
  MAX_ANALYSIS_SIGNALS,
  MAX_IMPROVEMENTS_HISTORY_SIZE,
} from '../../common/constants';
import type { GetFeedbackContextResponse } from '../../common/http_api/feedback_context';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import { buildImprovementsJsonSchema } from '../../common/http_api/improvements_output_schema';
import { getKis } from '../ai_indices/ki_list';
import type { AiIndexService } from '../ai_indices/service';
import type { ImprovementsServiceApi } from '../improvements/service';
import { renderBriefing } from './briefing';
import { groupSignals } from './group_signals';
import { selectSignals } from './select_signals';

export interface BuildFeedbackContextDeps {
  /** Request-scoped: every read here is authorized against the caller, not against Kibana. */
  esClient: ElasticsearchClient;
  aiIndexService: AiIndexService;
  improvementsService: ImprovementsServiceApi;
}

/**
 * Assembles everything one analysis run reads, in one place.
 *
 * Server-side rather than as ES|QL steps in the workflow template, because signal attribution has
 * real branches worth testing, and because the interactive "Analyze & improve" hand-off should
 * eventually select and group the same way — which only stays true if there is one implementation
 * of what a run looks at.
 */
export const buildFeedbackContext = async (
  aiIndexId: string,
  { esClient, aiIndexService, improvementsService }: BuildFeedbackContextDeps,
  { now }: { now?: Date } = {}
): Promise<GetFeedbackContextResponse> => {
  const aiIndex = await aiIndexService.get(aiIndexId);
  const feedbackAnalysis = aiIndex.feedback_analysis;

  // An index with no analysis block is not misconfigured — it has simply never been scheduled, and
  // the button still works on it. Fall back to the same defaults the settings route would apply.
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
      size: MAX_ANALYSIS_SIGNALS,
      ...(now ? { now } : {}),
    }),
    getKis(esClient, { destValue: aiIndex.dest.value, size: KI_SUMMARY_PAGE_SIZE }),
    improvementsService.historyFor(aiIndexId, { size: MAX_IMPROVEMENTS_HISTORY_SIZE }),
  ]);

  const groups = groupSignals(selection.signals);
  const run = {
    signal_window: selection.window,
    signal_spaces: selection.spaces,
    signal_count: selection.signals.length,
  };

  return {
    ai_index: aiIndex,
    agent_id: agentId,
    allowed_actions: allowedActions,
    run,
    groups,
    signals: selection.signals,
    ki_summary: kiList.summary,
    improvement_history: history,
    briefing: renderBriefing({
      aiIndex,
      run,
      groups,
      kiSummary: kiList.summary,
      history,
      allowedActions,
    }),
    output_schema: buildImprovementsJsonSchema(allowedActions),
    // Groups rather than raw signals: a window full of healthy retrievals has signals but nothing
    // to analyze, and spending an LLM call to be told so is the run's most common failure mode.
    has_signals: groups.length > 0,
  };
};

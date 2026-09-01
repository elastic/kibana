/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { RunBudgetGroupId, RunQuotaWindow } from '../../../common/run_quotas';
import { RUN_BUDGET_GROUP_IDS } from '../../../common/run_quotas';

export const RUN_QUOTA_WORKFLOW_IDS_BY_GROUP: Record<RunBudgetGroupId, readonly string[]> = {
  detection: [SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID],
  investigation: [SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID],
  ki_extraction: [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID],
  memory: [
    SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
    SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
    SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
    SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  ],
};

export const countRunQuotaWorkflowExecutions = async ({
  esClient,
  window,
}: {
  esClient: ElasticsearchClient;
  window: RunQuotaWindow;
}): Promise<Record<RunBudgetGroupId, number>> => {
  const counts = await Promise.all(
    RUN_BUDGET_GROUP_IDS.map(async (group) => {
      const response = await esClient.count({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        allow_no_indices: true,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { terms: { workflowId: [...RUN_QUOTA_WORKFLOW_IDS_BY_GROUP[group]] } },
              {
                range: {
                  createdAt: {
                    gte: window.start,
                    lt: window.resetsAt,
                  },
                },
              },
            ],
            must_not: [{ term: { isTestRun: true } }, { term: { status: 'skipped' } }],
          },
        },
      });
      return [group, response.count] as const;
    })
  );

  return Object.fromEntries(counts) as Record<RunBudgetGroupId, number>;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import {
  prettifyDashboardOperationSchema,
  type DashboardOperation,
} from '../generate/core';
import type { DashboardFinding } from '../review_dashboard/types';

const prettifyPlanSchema = z.object({
  operations: z.array(prettifyDashboardOperationSchema),
});

const PRETTIFY_PLAN_PROMPT = `You are the Prettify planner for a Kibana dashboard. Dashboard Review produced findings. Each finding.fix already uses generate_dashboard field names.

Write one ordered operations[] batch that implements the findings. You have the generate operations schema. Use only add_section, update_panel_layouts, edit_panels, and add_controls. Do not add or remove visualization panels. Do not remove sections or controls. Do not rewrite titles.

Typical batching: add_section first, then one update_panel_layouts for packed grids only, then edit_panels (source: "request", type: "vis") with a natural-language query for each visual change — chart type, hide chrome title, strip invented metric fills, trendlines, secondary metrics, colors, legends. The visualization author decides how to apply the query. Then add_controls. Skip any finding you cannot implement faithfully.

Empty operations is valid.`;

export type PlanPrettifyOperations = (args: {
  findings: DashboardFinding[];
  modelProvider: ModelProvider;
}) => Promise<DashboardOperation[]>;

export const planPrettifyOperations: PlanPrettifyOperations = async ({
  findings,
  modelProvider,
}) => {
  const model = await modelProvider.selectModel({ effortLevel: EffortLevels.medium });
  const planner = model.chatModel.withStructuredOutput(prettifyPlanSchema, {
    name: 'prettify_operations',
  });
  const response = await planner.invoke([
    createUserMessage(`${PRETTIFY_PLAN_PROMPT}

Findings:
${JSON.stringify(findings)}`),
  ]);

  const parsed = prettifyPlanSchema.safeParse(response);
  return parsed.success ? parsed.data.operations : [];
};

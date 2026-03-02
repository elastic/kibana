/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod';
import type { SignificantEventsAgentToolDependencies } from '../tool_dependencies';
import { STREAMS_TOOL_IDS } from './constants';

const timeRangeSchema = z.object({ from: z.string(), to: z.string() });

export const COMPARE_TO_BASELINE_TOOL_ID = STREAMS_TOOL_IDS.compare_to_baseline;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  current_window: timeRangeSchema.describe('Current (incident) window to compare.'),
  baseline_type: z
    .enum(['same_window_yesterday', 'same_window_last_week', 'custom'])
    .describe(
      'Preset: same window yesterday/last week (returns new vs chronic vs regression). Custom: use baseline_range (returns significant terms unique to current window).'
    ),
  baseline_range: timeRangeSchema
    .optional()
    .describe('Required when baseline_type is "custom"; the baseline time window.'),
  filter: z
    .record(z.unknown())
    .optional()
    .describe('Optional KQL/ES|QL filter to scope the comparison.'),
});

/** Handler must validate: when baseline_type is "custom", baseline_range is required. */
export const getCompareToBaselineTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: COMPARE_TO_BASELINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Compare current_window to a baseline. Use baseline_type same_window_yesterday or same_window_last_week to classify as new vs chronic vs regression. Use baseline_type custom with baseline_range to get significant terms unique to the current window (e.g. version appeared, error code spiked). Use before emitting an insight to validate it is not stable background or a known chronic condition.',
  tags: [],
  schema,
  handler: async (_input, context) => {
    const clients = await deps.getScopedClients({ request: context.request });
    void clients;
    return {
      results: [{ type: ToolResultType.other, data: {} }],
    };
  },
});

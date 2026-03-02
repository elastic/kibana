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

const timeRangeSchema = z
  .object({
    from: z.string().describe('Start of range (e.g. ISO timestamp).'),
    to: z.string().describe('End of range (e.g. ISO timestamp).'),
  })
  .optional();

const sensitivitySchema = z.enum(['low', 'medium', 'high']).optional().default('medium');

export const FIND_CHANGED_QUERIES_TOOL_ID = STREAMS_TOOL_IDS.find_changed_queries;

const focusOnSchema = z
  .enum(['new', 'stopped', 'changed', 'all'])
  .optional()
  .default('all')
  .describe('Return only rules in this state: new, stopped, changed, or all.');

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  time_range: timeRangeSchema.describe('Analysis window; defaults to full alert window.'),
  baseline_range: timeRangeSchema.describe(
    'Comparison window; defaults to previous equivalent period.'
  ),
  sensitivity: sensitivitySchema.describe('Change detection threshold.'),
  focus_on: focusOnSchema.describe(
    'Narrow results: only new rules, only stopped, only changed, or all (default).'
  ),
});

export const getFindChangedQueriesTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: FIND_CHANGED_QUERIES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Detect which rules changed relative to a configurable baseline_range. Signals: rate change, entity cardinality change, new-entity appearance, severity shift. Returns rule IDs per state (new, stopped, changed, stable). Use focus_on to get only the states you need (e.g. new, changed); pass those rule IDs to cluster_by_time so time clustering runs on meaningful signal. Omit stable rule IDs when calling cluster_by_time to filter out background noise.',
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

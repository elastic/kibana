/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsTermsAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import { get, isArray } from 'lodash';
import moment from 'moment';
import { z } from '@kbn/zod';
import type { SignificantEventsAgentToolDependencies } from '../tool_dependencies';
import { STREAMS_TOOL_IDS } from './constants';

const ALERTS_INDEX = '.alerts-streams.alerts-default';

/** Minimum ratio current/baseline to classify as regression (e.g. 2 = current at least 2x baseline). */
const REGRESSION_RATIO = 2;

const timeRangeSchema = z.object({
  from: z.string().describe('Start of range (e.g. ISO timestamp).'),
  to: z.string().describe('End of range (e.g. ISO timestamp).'),
});

export const COMPARE_TO_BASELINE_TOOL_ID = STREAMS_TOOL_IDS.compare_to_baseline;

const schema = z.object({
  streams: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of stream names to limit the comparison to. When omitted or empty, all streams the user has access to are considered.'
    ),
  current_window: timeRangeSchema.describe('Current (investigation) window to compare.'),
  baseline_type: z
    .enum(['same_window_yesterday', 'same_window_last_week', 'custom'])
    .describe(
      'Preset: same_window_yesterday or same_window_last_week (same length, previous day/week). Custom: provide baseline_range.'
    ),
  baseline_range: timeRangeSchema
    .optional()
    .describe('Required when baseline_type is "custom"; the baseline time window.'),
});

export interface ComparedRule {
  rule_id: string;
  rule_name: string;
  rule_query: string;
  current_count: number;
  baseline_count: number;
}

export interface CompareToBaselineResult {
  /** Rules with alerts in current window only (not in baseline). */
  new: ComparedRule[];
  /** Rules with alerts in both windows (recurring pattern). */
  chronic: ComparedRule[];
  /** Rules with alerts in baseline only (stopped firing in current window). */
  stopped: ComparedRule[];
  /** Rules with alerts in both but current significantly higher (e.g. 2x baseline). */
  regression: ComparedRule[];
  new_count: number;
  chronic_count: number;
  stopped_count: number;
  regression_count: number;
  total_alert_count_current: number;
  total_alert_count_baseline: number;
}

async function getAlertCountsByRule(
  esClient: Awaited<
    ReturnType<SignificantEventsAgentToolDependencies['getScopedClients']>
  >['scopedClusterClient']['asCurrentUser'],
  ruleIds: string[],
  from: string,
  to: string,
  signal?: AbortSignal
): Promise<Map<string, number>> {
  if (ruleIds.length === 0) return new Map();
  const response = await esClient.search(
    {
      index: ALERTS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: from, lte: to } } },
            { terms: { 'kibana.alert.rule.uuid': ruleIds } },
          ],
        },
      },
      aggs: {
        by_rule: {
          terms: { field: 'kibana.alert.rule.uuid', size: 10_000 },
        },
      },
    },
    { signal }
  );
  const buckets = get(response, 'aggregations.by_rule.buckets') as
    | AggregationsTermsAggregateBase<{ key: string; doc_count: number }>['buckets']
    | undefined;
  const map = new Map<string, number>();
  if (isArray(buckets)) {
    for (const b of buckets) {
      map.set(String(b.key), b.doc_count);
    }
  }
  return map;
}

function computeBaselineWindow(
  current: { from: string; to: string },
  baselineType: 'same_window_yesterday' | 'same_window_last_week' | 'custom',
  baselineRange?: { from: string; to: string }
): { from: string; to: string } {
  if (baselineType === 'custom') {
    if (!baselineRange) {
      throw new Error('baseline_range is required when baseline_type is "custom".');
    }
    return baselineRange;
  }
  const fromM = moment(current.from);
  const toM = moment(current.to);
  if (baselineType === 'same_window_yesterday') {
    return {
      from: fromM.clone().subtract(1, 'day').toISOString(),
      to: toM.clone().subtract(1, 'day').toISOString(),
    };
  }
  return {
    from: fromM.clone().subtract(1, 'week').toISOString(),
    to: toM.clone().subtract(1, 'week').toISOString(),
  };
}

export const getCompareToBaselineTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: COMPARE_TO_BASELINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Compare current_window to a baseline to classify rules as new (only in current), chronic (in both), stopped (only in baseline), or regression (in both but current much higher). Use baseline_type same_window_yesterday or same_window_last_week for preset, or custom with baseline_range. Loads streams the user has access to; optionally pass streams to limit. Use to avoid chasing chronic noise or to validate an insight before emitting.',
  tags: [],
  schema,
  handler: async (input, context) => {
    const { current_window: currentWindow, baseline_type: baselineType } = input;
    const { queryClient, scopedClusterClient, streamsClient } = await deps.getScopedClients({
      request: context.request,
    });
    const esClient = scopedClusterClient.asCurrentUser;
    const signal = (context as { signal?: AbortSignal }).signal;

    if (baselineType === 'custom' && !input.baseline_range) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              error: 'baseline_range is required when baseline_type is "custom".',
              ...emptyResult(),
            } as CompareToBaselineResult & { error: string },
          },
        ],
      };
    }

    let baselineWindow: { from: string; to: string };
    try {
      baselineWindow = computeBaselineWindow(currentWindow, baselineType, input.baseline_range);
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              error: err instanceof Error ? err.message : String(err),
              ...emptyResult(),
            } as CompareToBaselineResult & { error: string },
          },
        ],
      };
    }

    const allStreams = await streamsClient.listStreams();
    const allowedNames = new Set(allStreams.map((s) => s.name));
    const requestedStreams = input.streams ?? [];
    const streamNames =
      requestedStreams.length > 0
        ? requestedStreams.filter((name) => allowedNames.has(name))
        : Array.from(allowedNames);

    const queryLinks = await queryClient.getQueryLinks(streamNames);
    if (queryLinks.length === 0) {
      return {
        results: [{ type: ToolResultType.other, data: emptyResult() }],
      };
    }

    const ruleIds = queryLinks.map((l) => l.rule_id);

    const [currentCounts, baselineCounts] = await Promise.all([
      getAlertCountsByRule(esClient, ruleIds, currentWindow.from, currentWindow.to, signal),
      getAlertCountsByRule(esClient, ruleIds, baselineWindow.from, baselineWindow.to, signal),
    ]);

    const newRules: ComparedRule[] = [];
    const chronicRules: ComparedRule[] = [];
    const stoppedRules: ComparedRule[] = [];
    const regressionRules: ComparedRule[] = [];
    let totalCurrent = 0;
    let totalBaseline = 0;

    for (const link of queryLinks) {
      const ruleId = link.rule_id;
      const current = currentCounts.get(ruleId) ?? 0;
      const baseline = baselineCounts.get(ruleId) ?? 0;
      totalCurrent += current;
      totalBaseline += baseline;

      const q = link.query;
      const ruleName = q?.title ?? link['asset.id'] ?? ruleId;
      const ruleQuery = q?.esql?.query ?? q?.kql?.query ?? '';
      const entry: ComparedRule = {
        rule_id: ruleId,
        rule_name: ruleName,
        rule_query: ruleQuery,
        current_count: current,
        baseline_count: baseline,
      };

      if (current > 0 && baseline === 0) {
        newRules.push(entry);
      } else if (current === 0 && baseline > 0) {
        stoppedRules.push(entry);
      } else if (current > 0 && baseline > 0) {
        if (current >= baseline * REGRESSION_RATIO) {
          regressionRules.push(entry);
        } else {
          chronicRules.push(entry);
        }
      }
    }

    const result: CompareToBaselineResult = {
      new: newRules,
      chronic: chronicRules,
      stopped: stoppedRules,
      regression: regressionRules,
      new_count: newRules.length,
      chronic_count: chronicRules.length,
      stopped_count: stoppedRules.length,
      regression_count: regressionRules.length,
      total_alert_count_current: totalCurrent,
      total_alert_count_baseline: totalBaseline,
    };

    deps.logger.debug(
      `compare_to_baseline baseline_type=${baselineType} new=${result.new_count} chronic=${result.chronic_count} stopped=${result.stopped_count} regression=${result.regression_count}`
    );

    return {
      results: [{ type: ToolResultType.other, data: result }],
    };
  },
});

function emptyResult(): CompareToBaselineResult {
  return {
    new: [],
    chronic: [],
    stopped: [],
    regression: [],
    new_count: 0,
    chronic_count: 0,
    stopped_count: 0,
    regression_count: 0,
    total_alert_count_current: 0,
    total_alert_count_baseline: 0,
  };
}

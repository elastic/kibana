/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { scoreToolUsage, scoreToolUsageContinuation } from './tool_usage';

const TOOL_ID_EXECUTE_ESQL = platformCoreTools.executeEsql;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;

const toolCall = (
  toolId: string,
  params?: Record<string, unknown>,
  results?: unknown[]
): ConverseStep => ({
  type: 'tool_call',
  tool_id: toolId,
  tool_call_id: toolId,
  params,
  results,
});

const retryCall = (toolId: string): ConverseStep => ({
  ...toolCall(toolId),
  params: { items: [{ event_id: 'failed-event' }] },
});

const retryableWriteCall = (): ConverseStep => ({
  ...toolCall(TOOL_ID_DISCOVERY_WRITE),
  results: [{ data: { results: [{ index: 0, written: false, reason: 'bulk_error' }] } }],
});

const allExpectedTools: ConverseStep[] = [
  toolCall(TOOL_ID_EVENT_SEARCH, { exclude_unconfirmed_signals: true }),
  toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
  toolCall(TOOL_ID_EXECUTE_ESQL),
  toolCall(TOOL_ID_DISCOVERY_WRITE),
];

describe('scoreToolUsage', () => {
  it('scores 1 when an empty batch makes no tool calls', () => {
    expect(scoreToolUsage({ steps: [], detectionCount: 0 })).toEqual({
      score: 1,
      label: 'correct',
      explanation: 'Empty batch: no tool calls made as expected',
    });
  });

  it('scores 0 when an empty batch makes unexpected tool calls', () => {
    const result = scoreToolUsage({ steps: [toolCall(TOOL_ID_KI_SEARCH)], detectionCount: 0 });
    expect(result.score).toBe(0);
    expect(result.label).toBe('unexpected-tools');
  });

  it('scores 1 and labels "correct" when all expected tools were called', () => {
    expect(scoreToolUsage({ steps: allExpectedTools, detectionCount: 1 })).toEqual({
      score: 1,
      label: 'correct',
      explanation: 'Correctly called all tools',
    });
  });

  it('scores 0 and labels missing-discovery_write when discovery_write is never called', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_DISCOVERY_WRITE);
    const result = scoreToolUsage({ steps, detectionCount: 1 });
    expect(result.score).toBe(0);
    expect(result.label).toBe(`missing-${TOOL_ID_DISCOVERY_WRITE}`);
  });

  it('gives partial credit when one of the three expected investigation tools is missing', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const result = scoreToolUsage({ steps, detectionCount: 1 });
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.label).toBe(`missing-${TOOL_ID_EVENT_SEARCH}`);
  });

  it('rejects event searches that include confirmed false signals', () => {
    const steps = allExpectedTools.map((step) =>
      step.tool_id === TOOL_ID_EVENT_SEARCH
        ? toolCall(TOOL_ID_EVENT_SEARCH, { exclude_unconfirmed_signals: false })
        : step
    );
    const result = scoreToolUsage({ steps, detectionCount: 1 });

    expect(result.score).toBe(0);
    expect(result.label).toBe('unfiltered-event-search');
  });

  it('requires query KI search', () => {
    const steps = [
      toolCall(TOOL_ID_EVENT_SEARCH, { exclude_unconfirmed_signals: true }),
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['feature'] }),
      toolCall(TOOL_ID_DISCOVERY_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe('missing-query-ki-search');
  });

  it('penalizes multiple discovery writes without a partial-failure retry', () => {
    const result = scoreToolUsage({
      steps: [...allExpectedTools, toolCall(TOOL_ID_DISCOVERY_WRITE)],
      detectionCount: 1,
    });
    expect(result).toMatchObject({ score: 0.75, label: 'multiple-discovery-write-calls' });
  });

  it('allows one retry after a discovery bulk item fails', () => {
    const steps = allExpectedTools.map((step) =>
      step.tool_id === TOOL_ID_DISCOVERY_WRITE ? retryableWriteCall() : step
    );
    const result = scoreToolUsage({
      steps: [...steps, retryCall(TOOL_ID_DISCOVERY_WRITE)],
      detectionCount: 1,
    });
    expect(result).toMatchObject({ score: 1, label: 'correct' });
  });
});

describe('scoreToolUsageContinuation', () => {
  it('scores 0 with an explanatory message when there are no cycles', () => {
    expect(scoreToolUsageContinuation([])).toEqual({
      score: 0,
      label: 'no-cycles',
      explanation: 'No cycles to score',
    });
  });

  it('scores 1 when every cycle called all expected tools (reuses scoreToolUsage per cycle)', () => {
    const result = scoreToolUsageContinuation([
      { producedEventIds: ['event-1'], steps: allExpectedTools },
      { producedEventIds: ['event-1'], steps: allExpectedTools },
    ]);
    expect(result.score).toBe(1);
  });

  it('averages per-cycle scores rather than treating one bad cycle as a total failure', () => {
    const missingEventSearch = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const result = scoreToolUsageContinuation([
      {
        producedEventIds: ['svc__a-1111'],
        steps: allExpectedTools,
      },
      {
        producedEventIds: ['svc__a-1111'],
        steps: missingEventSearch, // missing 1 of 3 → 2/3
      },
    ]);
    expect(result.score).toBeCloseTo((1 + 2 / 3) / 2);
    expect(result.label).toBe('partial');
    expect(result.explanation).toContain(`cycle 2: missing-${TOOL_ID_EVENT_SEARCH} (${2 / 3})`);
  });

  it('treats a cycle with no recorded steps as having called nothing', () => {
    const result = scoreToolUsageContinuation([{ producedEventIds: [] }]);
    expect(result.score).toBeLessThan(1);
  });

  it('requires a topology-filtered event search for topology continuation cycles', () => {
    const result = scoreToolUsageContinuation([
      {
        producedEventIds: ['event-1'],
        expectTopologyEventSearch: true,
        steps: allExpectedTools,
      },
    ]);

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('missing-topology-search');
  });

  it('accepts a topology-filtered event search for topology continuation cycles', () => {
    const result = scoreToolUsageContinuation([
      {
        producedEventIds: ['event-1'],
        expectTopologyEventSearch: true,
        steps: [
          ...allExpectedTools,
          toolCall(TOOL_ID_EVENT_SEARCH, {
            topology_feature_ids: ['transactionhistory'],
            exclude_unconfirmed_signals: true,
          }),
        ],
      },
    ]);

    expect(result.score).toBe(1);
  });
});

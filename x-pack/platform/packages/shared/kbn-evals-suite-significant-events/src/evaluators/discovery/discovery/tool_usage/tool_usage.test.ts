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
  eventsWrite: TOOL_ID_EVENTS_WRITE,
} = platformSignificantEventsTools;

const toolCall = (
  toolId: string,
  params: Record<string, unknown> | undefined = toolId === TOOL_ID_EVENTS_WRITE
    ? { items: [{ status: 'open' }] }
    : undefined,
  results?: unknown[]
): ConverseStep => ({
  type: 'tool_call',
  tool_id: toolId,
  tool_call_id: toolId,
  params,
  results,
});

const invalidEventsWrite = (params: Record<string, unknown> | undefined): ConverseStep => ({
  type: 'tool_call',
  tool_id: TOOL_ID_EVENTS_WRITE,
  tool_call_id: TOOL_ID_EVENTS_WRITE,
  params,
});

const retryCall = (toolId: string): ConverseStep => ({
  ...toolCall(toolId),
  params: { items: [{ event_id: 'failed-event' }] },
});

const retryableWriteCall = (): ConverseStep => ({
  ...toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ event_id: 'failed-event' }] }),
  results: [{ data: { results: [{ index: 0, written: false, reason: 'bulk_error' }] } }],
});

const allExpectedTools: ConverseStep[] = [
  toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
  toolCall(TOOL_ID_EXECUTE_ESQL),
  toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
  toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'open' }] }),
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

  it('scores 0 and labels missing-events_write when events_write is never called', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENTS_WRITE);
    const result = scoreToolUsage({ steps, detectionCount: 1 });
    expect(result.score).toBe(0);
    expect(result.label).toBe(`missing-${TOOL_ID_EVENTS_WRITE}`);
  });

  it.each([undefined, {}, { items: [] }] as const)(
    'rejects events_write with payload %p',
    (params) => {
      const steps = allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE ? invalidEventsWrite(params) : step
      );

      expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
        score: 0,
        label: 'invalid-events-write-payload',
      });
    }
  );

  it('allows one completed-payload recovery after a bare events_write call', () => {
    const missingItemsWrite = toolCall(TOOL_ID_EVENTS_WRITE, {}, [
      {
        data: {
          message:
            'Error: Received tool input did not match expected schema\nPass items as a non-empty array of event objects.',
        },
      },
    ]);
    const completedWrite = toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'open' }] });
    const steps = [
      ...allExpectedTools.filter((step) => step.tool_id !== TOOL_ID_EVENTS_WRITE),
      missingItemsWrite,
      completedWrite,
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toEqual({
      score: 1,
      label: 'correct',
      explanation: 'Correctly called all tools and retried after a schema or tool error',
    });
  });

  it('rejects duplicate rule ownership before the schema-error retry', () => {
    const duplicateRule = {
      type: 'detection',
      metadata: { rule_uuid: 'rule-uuid-1' },
    };
    const failedWrite = toolCall(
      TOOL_ID_EVENTS_WRITE,
      {
        items: [{ signals: [duplicateRule] }, { signals: [duplicateRule] }],
      },
      [
        {
          data: {
            message:
              'Error: Received tool input did not match expected schema\nEach detection rule UUID may appear in only one event item per write',
          },
        },
      ]
    );
    const emptyRetry = invalidEventsWrite({});
    const steps = [
      ...allExpectedTools.filter((step) => step.tool_id !== TOOL_ID_EVENTS_WRITE),
      failedWrite,
      emptyRetry,
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'duplicate-rule-across-items',
    });
  });

  it('gives partial credit when one of the three expected grounding tools is missing', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const result = scoreToolUsage({ steps, detectionCount: 1 });
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.label).toBe(`missing-${TOOL_ID_EVENT_SEARCH}`);
  });

  it('requires routing search before writing a new event when no continuation candidate exists', () => {
    const stepsWithoutRouting = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const stepsWithNoCandidate = [
      ...stepsWithoutRouting.slice(0, -1),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }, [
        { data: { total: 0, events: [] } },
      ]),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps: stepsWithoutRouting, detectionCount: 1 }).label).toBe(
      `missing-${TOOL_ID_EVENT_SEARCH}`
    );
    expect(scoreToolUsage({ steps: stepsWithNoCandidate, detectionCount: 1 }).score).toBe(1);
  });

  it('scores live Agent Builder underscore tool ids as the dotted equivalents', () => {
    const steps: ConverseStep[] = [
      toolCall('platform_sig_events_ki_search', { kind: ['query'] }),
      toolCall('platform_core_execute_esql'),
      toolCall('platform_sig_events_event_search', { rule_uuids: ['rule-uuid-1'] }),
      toolCall('platform_sig_events_events_write', { items: [{ status: 'open' }] }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe('correct');
  });

  it('requires topology search before writing a topology-bearing event after a zero-result rule search', () => {
    const steps = [
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }, [
        { data: { total: 0, events: [] } },
      ]),
      toolCall(TOOL_ID_EVENTS_WRITE, {
        items: [{ causal_features: [{ feature_id: 'checkout' }], blast_radius: [] }],
      }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'missing-topology-search',
    });
  });

  it('requires a topology search after a zero-result rule search even for a new episode', () => {
    const steps = [
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(
        TOOL_ID_EVENT_SEARCH,
        { exclude_unconfirmed_signals: true, rule_uuids: ['rule-uuid-1'] },
        [{ data: { total: 0, events: [] } }]
      ),
      toolCall(TOOL_ID_EVENTS_WRITE, {
        items: [{ causal_features: [{ feature_id: 'checkout' }], blast_radius: [] }],
      }),
    ];

    expect(
      scoreToolUsage({ steps, detectionCount: 1, allowNewEventTopologyWrite: true }).label
    ).toBe('missing-topology-search');
  });

  it('requires query KI search', () => {
    const steps = [
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['feature'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe(`missing-${TOOL_ID_KI_SEARCH}`);
  });

  it('penalizes multiple event writes without a partial-failure retry', () => {
    const result = scoreToolUsage({
      steps: [...allExpectedTools, toolCall(TOOL_ID_EVENTS_WRITE)],
      detectionCount: 1,
    });
    expect(result).toMatchObject({ score: 0.75, label: `multiple-${TOOL_ID_EVENTS_WRITE}-calls` });
    expect(result.explanation).toBe(
      `${TOOL_ID_EVENTS_WRITE} was called 2 times without one justified partial-failure retry`
    );
  });

  it('allows one retry after an event bulk item fails', () => {
    const steps = allExpectedTools.map((step) =>
      step.tool_id === TOOL_ID_EVENTS_WRITE ? retryableWriteCall() : step
    );
    const result = scoreToolUsage({
      steps: [...steps, retryCall(TOOL_ID_EVENTS_WRITE)],
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

  it('allows the establishing cycle to create topology without a topology search', () => {
    const result = scoreToolUsageContinuation([
      {
        producedEventIds: ['event-1'],
        expectTopologyEventSearch: true,
        steps: allExpectedTools,
      },
    ]);

    expect(result.score).toBe(1);
  });

  it('requires a topology-filtered event search for follow-up topology cycles', () => {
    const result = scoreToolUsageContinuation([
      {
        producedEventIds: ['event-1'],
        expectTopologyEventSearch: true,
        steps: [
          ...allExpectedTools,
          toolCall(TOOL_ID_EVENT_SEARCH, {
            topology_feature_ids: ['transactionhistory'],
          }),
        ],
      },
      {
        producedEventIds: ['event-1'],
        expectTopologyEventSearch: true,
        steps: allExpectedTools,
      },
    ]);

    expect(result.score).toBeCloseTo(0.5);
    expect(result.explanation).toContain('cycle 2: missing-topology-search');
  });

  it('still flags missing-topology-search when expectReuse is false (new event after closed seed)', () => {
    const stepsWithTopologyWrite = [
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }, [
        { data: { total: 0, events: [] } },
      ]),
      toolCall(TOOL_ID_EVENTS_WRITE, {
        items: [{ causal_features: [{ feature_id: 'checkout' }], blast_radius: [] }],
      }),
    ];

    expect(scoreToolUsage({ steps: stepsWithTopologyWrite, detectionCount: 1 }).label).toBe(
      'missing-topology-search'
    );

    const result = scoreToolUsageContinuation([
      {
        producedEventIds: ['event-new'],
        expectReuse: false,
        steps: stepsWithTopologyWrite,
      },
    ]);

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('cycle 1: missing-topology-search (0)');
  });
});

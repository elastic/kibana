/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { scoreToolUsage, scoreToolUsageContinuation } from './tool_usage';
import { memoryToolIds } from '../../utils/tool_usage';

const TOOL_ID_EXECUTE_ESQL = platformCoreTools.executeEsql;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
} = platformSignificantEventsTools;
const {
  memorySearch: TOOL_ID_MEMORY_SEARCH,
  memoryRead: TOOL_ID_MEMORY_READ,
  memoryPatch: TOOL_ID_MEMORY_PATCH,
  memoryWrite: TOOL_ID_MEMORY_WRITE,
} = memoryToolIds;

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
  toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
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

  it('gives partial credit when one of the four expected investigation tools is missing', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const result = scoreToolUsage({ steps, detectionCount: 1 });
    expect(result.score).toBeCloseTo(3 / 4);
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

  it('requires a memory search before KI search and ES|QL grounding', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_MEMORY_SEARCH);

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: `missing-${TOOL_ID_MEMORY_SEARCH}`,
    });
  });

  it('rejects a memory search performed after KI grounding begins', () => {
    const steps = [
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-search-after-grounding',
    });
  });

  it('rejects one memory search per rule_uuid before grounding', () => {
    const steps = [
      toolCall(TOOL_ID_MEMORY_SEARCH, {
        query: 'f0886d68-d5d6-5941-ba01-449666ea5960 "Ad Service Startup"',
        categories: [],
        mode: 'hybrid',
      }),
      toolCall(TOOL_ID_MEMORY_SEARCH, {
        query: 'a11b22c3-d44e-5555-ba01-449666ea5999 "Checkout latency"',
        categories: [],
        mode: 'hybrid',
      }),
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 2 })).toMatchObject({
      score: 0,
      label: 'multiple-memory-search-before-grounding',
    });
  });

  it('rejects a memory search that filters to a streams/ category', () => {
    const steps = allExpectedTools.map((step) =>
      step.tool_id === TOOL_ID_MEMORY_SEARCH
        ? toolCall(TOOL_ID_MEMORY_SEARCH, {
            query: 'allocator zookeeper session',
            categories: ['streams/cphosted-logs'],
          })
        : step
    );

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-search-stream-category-filter',
    });
  });

  it('requires a memory read when the search finds relevant pages', () => {
    const steps = allExpectedTools.map((step) =>
      step.tool_id === TOOL_ID_MEMORY_SEARCH
        ? toolCall(
            TOOL_ID_MEMORY_SEARCH,
            { query: 'allocator zookeeper session', categories: [] },
            [{ data: { total: 1, items: [{ id: 'allocator-zookeeper-connection-loss' }] } }]
          )
        : step
    );

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: `missing-${TOOL_ID_MEMORY_READ}`,
    });
  });

  it('treats gaps-only search hits as empty memory and still requires full KI grounding', () => {
    const steps = allExpectedTools.map((step) =>
      step.tool_id === TOOL_ID_MEMORY_SEARCH
        ? toolCall(
            TOOL_ID_MEMORY_SEARCH,
            {
              query:
                'f0886d68-d5d6-5941-ba01-449666ea5960 "Ad Service Startup" ad service startup logs.otel',
              categories: [],
              mode: 'hybrid',
            },
            [
              {
                data: {
                  query:
                    'f0886d68-d5d6-5941-ba01-449666ea5960 "Ad Service Startup" ad service startup logs.otel',
                  total: 1,
                  items: [
                    {
                      id: '29dfd6cb-544f-4596-84b2-fd62ccff576b',
                      name: '_gaps/overview',
                      title: 'Data Source & Access Gaps',
                      score: 0.0952381,
                      categories: ['_system/gaps'],
                    },
                  ],
                },
              },
            ]
          )
        : step
    );

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe('correct');
  });

  it('rejects memory write-back before events_write', () => {
    const steps = [
      ...allExpectedTools.filter((step) => step.tool_id !== TOOL_ID_EVENTS_WRITE),
      toolCall(TOOL_ID_MEMORY_PATCH),
      toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'dismissed' }] }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-write-before-events-write',
    });
  });

  it('rejects memory write-back after an unchanged continuation', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'open' }] }),
              results: [
                {
                  data: {
                    results: [
                      {
                        index: 0,
                        event_id: 'event-1',
                        written: false,
                        reason: 'unchanged_outcome',
                      },
                    ],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_PATCH),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-write-after-unchanged-outcome',
    });
  });

  it('accepts compare-then-patch after a changed event write', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, {
                items: [{ status: 'open', severity: '40-medium' }],
              }),
              results: [
                {
                  data: {
                    results: [{ index: 0, event_id: 'event-1', written: true, reason: 'created' }],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_PATCH, {
        id: '72b85ef5-89e3-4b3d-8427-ea59bbe8c798',
        operations: [
          {
            heading: 'Detection',
            append: '- 2026-08-19: rule_uuid=rule-uuid-1 status=open query=FROM logs-*',
          },
        ],
        change_summary: 'Record this cycle on allocator-zookeeper-connection-loss',
      }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe('correct');
  });

  it('rejects memory_patch that uses old_text after a changed event write', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, {
                items: [{ status: 'dismissed' }],
              }),
              results: [
                {
                  data: {
                    results: [{ index: 0, event_id: 'event-1', written: true, reason: 'created' }],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_PATCH, {
        id: '72b85ef5-89e3-4b3d-8427-ea59bbe8c798',
        operations: [
          {
            old_text: '## Detection history\n- 2026-08-19: rule_uuid=rule-uuid-1',
            new_text: '- 2026-08-19: rule_uuid=rule-uuid-1 status=dismissed',
          },
        ],
        change_summary: 'Record this cycle',
      }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'destructive-memory-patch',
    });
  });

  it('rejects memory_patch with empty append', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'dismissed' }] }),
              results: [
                {
                  data: {
                    results: [{ index: 0, event_id: 'event-1', written: true, reason: 'created' }],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_PATCH, {
        id: 'page-1',
        operations: [{ heading: 'Detection history', append: '' }],
        change_summary: 'noop',
      }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'destructive-memory-patch',
    });
  });

  const recordedNoiseUuid = 'f0886d68-d5d6-5941-ba01-449666ea5960';
  const alreadyRecordedNoiseSteps: ConverseStep[] = [
    toolCall(
      TOOL_ID_MEMORY_SEARCH,
      { query: `${recordedNoiseUuid} "Ad Service Startup"`, categories: [] },
      [{ data: { items: [{ id: 'page-1', name: 'ad-service-startup-substring-false-positive' }] } }]
    ),
    toolCall(TOOL_ID_MEMORY_READ, { id: 'page-1' }, [
      {
        data: {
          content: `- 2026-08-19: rule_uuid ${recordedNoiseUuid} → status dismissed (false-positive substring match)`,
        },
      },
    ]),
    toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
    toolCall(TOOL_ID_EXECUTE_ESQL, {}, [
      { data: { columns: ['message'], values: [['expected noise']] } },
    ]),
  ];

  it('accepts already-recorded-noise that confirms then skips events_write', () => {
    expect(
      scoreToolUsage({
        steps: alreadyRecordedNoiseSteps,
        detectionCount: 1,
        inputRuleUuids: [recordedNoiseUuid],
      })
    ).toMatchObject({
      score: 1,
      label: 'correct',
    });
  });

  it('rejects already-recorded-noise that still calls events_write', () => {
    expect(
      scoreToolUsage({
        steps: [...alreadyRecordedNoiseSteps, toolCall(TOOL_ID_EVENTS_WRITE)],
        detectionCount: 1,
        inputRuleUuids: [recordedNoiseUuid],
      })
    ).toMatchObject({
      score: 0,
      label: 'already-recorded-noise-wrote-event',
    });
  });

  it('rejects already-recorded-noise that patches memory', () => {
    expect(
      scoreToolUsage({
        steps: [
          ...alreadyRecordedNoiseSteps,
          toolCall(TOOL_ID_MEMORY_PATCH, {
            id: 'page-1',
            operations: [{ heading: 'Detection history', append: '- extra' }],
            change_summary: 'dup',
          }),
        ],
        detectionCount: 1,
        inputRuleUuids: [recordedNoiseUuid],
      })
    ).toMatchObject({
      score: 0,
      label: 'already-recorded-noise-patched',
    });
  });

  it('rejects a memory read that happens after KI grounding begins', () => {
    const steps = [
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator', categories: [] }, [
        { data: { items: [{ id: 'page-1', name: 'allocator-noise' }] } },
      ]),
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_MEMORY_READ, { id: 'page-1' }, [{ data: { content: 'page' } }]),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-read-after-grounding',
    });
  });

  it('rejects reading more than three relevant memory pages', () => {
    const steps = [
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator', categories: [] }, [
        {
          data: { items: [{ id: 'page-1' }, { id: 'page-2' }, { id: 'page-3' }, { id: 'page-4' }] },
        },
      ]),
      ...['page-1', 'page-2', 'page-3', 'page-4'].map((id) =>
        toolCall(TOOL_ID_MEMORY_READ, { id }, [{ data: { content: 'page' } }])
      ),
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-read-budget-exceeded',
    });
  });

  it('rejects retrying a memory patch for the same page', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'open' }] }),
              results: [{ data: { results: [{ index: 0, written: true }] } }],
            }
          : step
      ),
      ...['first', 'retry'].map((append) =>
        toolCall(TOOL_ID_MEMORY_PATCH, {
          id: 'page-1',
          operations: [{ heading: 'Detection history', append }],
          change_summary: 'Record verdict',
        })
      ),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-patch-budget-exceeded',
    });
  });

  it('rejects memory_write that overwrites a search-returned page even after a changed event write', () => {
    const steps = [
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }, [
        {
          data: {
            total: 1,
            items: [{ id: 'page-1', name: 'allocator-zookeeper-connection-loss' }],
          },
        },
      ]),
      toolCall(TOOL_ID_MEMORY_READ, { id: 'page-1' }, [
        { data: { content: 'Transient ZooKeeper session suspend.' } },
      ]),
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      {
        ...toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'open' }] }),
        results: [
          {
            data: {
              results: [{ index: 0, event_id: 'event-1', written: true, reason: 'created' }],
            },
          },
        ],
      },
      toolCall(TOOL_ID_MEMORY_WRITE, { name: 'allocator-zookeeper-connection-loss' }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'unexpected-memory-write',
    });
  });

  it('accepts a first-sight memory_write after a dismissed write when no page matched', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, {
                items: [{ status: 'dismissed', assessment_note: 'Expected background noise.' }],
              }),
              results: [
                {
                  data: {
                    results: [{ index: 0, event_id: 'event-1', written: true, reason: 'created' }],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_WRITE, {
        name: 'balancereader-connection-refused-noise',
        title: 'Balance reader connection refused — expected noise',
        content:
          '## Detection\n- 2026-08-19: rule_uuid=rule-uuid-1 status=dismissed query=FROM logs | WHERE ...',
      }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe('correct');
  });

  it('rejects a first-sight memory_write before any changed event write', () => {
    const steps = [
      ...allExpectedTools.filter((step) => step.tool_id !== TOOL_ID_EVENTS_WRITE),
      toolCall(TOOL_ID_MEMORY_WRITE, { name: 'balancereader-connection-refused-noise' }),
      toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'dismissed' }] }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-write-before-events-write',
    });
  });

  it('flags multiple pre-grounding memory searches even when non-tool_call steps are interleaved', () => {
    const steps: ConverseStep[] = [
      { type: 'reasoning' },
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'checkout latency', categories: [] }),
      toolCall(TOOL_ID_KI_SEARCH, { kind: ['query'] }),
      toolCall(TOOL_ID_EXECUTE_ESQL),
      toolCall(TOOL_ID_EVENT_SEARCH, { rule_uuids: ['rule-uuid-1'] }),
      toolCall(TOOL_ID_EVENTS_WRITE),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 2 })).toMatchObject({
      score: 0,
      label: 'multiple-memory-search-before-grounding',
    });
  });

  it('accepts a patch after a mixed write batch containing one written item', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, {
                items: [{ status: 'open' }, { status: 'open' }],
              }),
              results: [
                {
                  data: {
                    results: [
                      { index: 0, event_id: 'event-1', written: true, reason: 'created' },
                      {
                        index: 1,
                        event_id: 'event-2',
                        written: false,
                        reason: 'unchanged_outcome',
                      },
                    ],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_PATCH, {
        id: '72b85ef5-89e3-4b3d-8427-ea59bbe8c798',
        operations: [{ heading: 'Detection', append: '- 2026-08-19: rule_uuid=rule-uuid-1' }],
        change_summary: 'Record this cycle',
      }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 2 }).label).toBe('correct');
  });

  it('rejects a patch when no preceding write item was written', () => {
    const steps = [
      ...allExpectedTools.map((step) =>
        step.tool_id === TOOL_ID_EVENTS_WRITE
          ? {
              ...toolCall(TOOL_ID_EVENTS_WRITE, { items: [{ status: 'open' }] }),
              results: [
                {
                  data: {
                    results: [
                      { index: 0, event_id: 'event-1', written: false, reason: 'bulk_error' },
                    ],
                  },
                },
              ],
            }
          : step
      ),
      toolCall(TOOL_ID_MEMORY_PATCH),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-write-without-changed-write',
    });
  });

  it('gates an underscore-id memory_write on a changed event write', () => {
    const steps = [
      ...allExpectedTools,
      toolCall('platform_sig_events_memory_write', { name: 'allocator-zookeeper-connection-loss' }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 })).toMatchObject({
      score: 0,
      label: 'memory-write-without-changed-write',
    });
  });

  it('scores live Agent Builder underscore tool ids as the dotted equivalents', () => {
    const steps: ConverseStep[] = [
      toolCall('platform_sig_events_memory_search', {
        query: 'allocator zookeeper session',
        categories: [],
      }),
      toolCall('platform_sig_events_ki_search', { kind: ['query'] }),
      toolCall('platform_core_execute_esql'),
      toolCall('platform_sig_events_event_search', { rule_uuids: ['rule-uuid-1'] }),
      toolCall('platform_sig_events_events_write', { items: [{ status: 'open' }] }),
    ];

    expect(scoreToolUsage({ steps, detectionCount: 1 }).label).toBe('correct');
  });

  it('requires topology search before writing a topology-bearing event after a zero-result rule search', () => {
    const steps = [
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
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
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
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
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
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
        steps: missingEventSearch, // missing 1 of 4 → 3/4
      },
    ]);
    expect(result.score).toBeCloseTo((1 + 3 / 4) / 2);
    expect(result.label).toBe('partial');
    expect(result.explanation).toContain(`cycle 2: missing-${TOOL_ID_EVENT_SEARCH} (${3 / 4})`);
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
      toolCall(TOOL_ID_MEMORY_SEARCH, { query: 'allocator zookeeper session', categories: [] }),
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

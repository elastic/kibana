/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import {
  getToolCallCount,
  extractToolCallIds,
  summarizeEsqlGrounding,
  extractEventSearchCandidateCount,
} from './tool_usage';

const TOOL_ID_EXECUTE_ESQL = platformCoreTools.executeEsql;
const TOOL_ID_KI_SEARCH = platformSignificantEventsTools.searchKnowledgeIndicators;
const TOOL_ID_EVENT_SEARCH = platformSignificantEventsTools.searchEvent;

const steps: ConverseStep[] = [
  { type: 'reasoning', reasoning: 'plan' },
  {
    type: 'tool_call',
    tool_id: TOOL_ID_KI_SEARCH,
    tool_call_id: 'ki-1',
    params: { kind: ['feature', 'query'], stream_names: ['logs'] },
    results: [{ type: 'other', data: { knowledge_indicators: [{ kind: 'query' }] } }],
  },
  {
    type: 'tool_call',
    tool_id: TOOL_ID_EXECUTE_ESQL,
    tool_call_id: 'esql-1',
    params: { query: 'FROM logs | WHERE body.text : "SQLState"' },
    results: [
      { type: 'query', data: { esql: '…' } },
      { type: 'esql_results', data: { columns: [{ name: '@timestamp' }], values: [['t', 'x']] } },
    ],
  },
  {
    type: 'tool_call',
    tool_id: TOOL_ID_EXECUTE_ESQL,
    tool_call_id: 'esql-2',
    params: { query: 'FROM logs | WHERE body.text : "Cache error"' },
    results: [{ type: 'esql_results', data: { columns: [{ name: '@timestamp' }], values: [] } }],
  },
];

describe('extractToolCallIds', () => {
  it('returns tool ids of tool_call steps in order, skipping reasoning', () => {
    expect(extractToolCallIds(steps)).toEqual([
      TOOL_ID_KI_SEARCH,
      TOOL_ID_EXECUTE_ESQL,
      TOOL_ID_EXECUTE_ESQL,
    ]);
  });
});

describe('getToolCallCount', () => {
  it('counts only tool_call steps', () => {
    expect(getToolCallCount(steps)).toBe(3);
  });
});

describe('summarizeEsqlGrounding', () => {
  it('counts execute_esql calls and how many returned rows', () => {
    expect(summarizeEsqlGrounding(steps)).toEqual({
      noOfToolCalls: 2,
      noOfToolCallsWithResults: 1,
    });
  });

  it('reports zero calls when execute_esql was never invoked', () => {
    expect(summarizeEsqlGrounding([{ type: 'tool_call', tool_id: TOOL_ID_KI_SEARCH }])).toEqual({
      noOfToolCalls: 0,
      noOfToolCallsWithResults: 0,
    });
  });
});

describe('extractEventSearchCandidateCount', () => {
  it('returns null when event_search was never called', () => {
    expect(extractEventSearchCandidateCount(steps)).toBeNull();
  });

  it('reads the candidate count from data.total when present', () => {
    const withEventSearch: ConverseStep[] = [
      ...steps,
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENT_SEARCH,
        tool_call_id: 'event-search-1',
        params: { state: 'open', stream_names: ['logs'] },
        results: [{ type: 'other', data: { events: [{ discovery_slug: 'a' }], total: 1 } }],
      },
    ];
    expect(extractEventSearchCandidateCount(withEventSearch)).toBe(1);
  });

  it('falls back to events.length when data.total is absent', () => {
    const withEventSearch: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENT_SEARCH,
        tool_call_id: 'event-search-1',
        params: { state: 'open', stream_names: ['logs'] },
        results: [
          { type: 'other', data: { events: [{ discovery_slug: 'a' }, { discovery_slug: 'b' }] } },
        ],
      },
    ];
    expect(extractEventSearchCandidateCount(withEventSearch)).toBe(2);
  });

  it('returns 0 when event_search was called and found no candidates', () => {
    const withEventSearch: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENT_SEARCH,
        tool_call_id: 'event-search-1',
        params: { state: 'open', stream_names: ['logs'] },
        results: [{ type: 'other', data: { events: [], total: 0 } }],
      },
    ];
    expect(extractEventSearchCandidateCount(withEventSearch)).toBe(0);
  });
});

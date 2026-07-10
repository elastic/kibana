/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import {
  extractDiscoveriesFromToolCall,
  extractSignificantEventsFromToolCall,
} from './parse_agent_output';

const TOOL_ID_DISCOVERY_WRITE = platformSignificantEventsTools.discoveryWrite;
const TOOL_ID_EVENTS_WRITE = platformSignificantEventsTools.eventsWrite;

describe('extractDiscoveriesFromToolCall', () => {
  it('extracts discoveries from discovery_write tool calls', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-1',
        params: { kind: 'discovery', title: 'DB latency spike', discovery_slug: 'slug-from-input' },
        results: [{ data: { discovery_slug: 'slug-resolved' } }],
      },
    ];
    const discoveries = extractDiscoveriesFromToolCall(steps);
    expect(discoveries).toHaveLength(1);
    expect(discoveries[0].title).toBe('DB latency spike');
    expect(discoveries[0].discovery_slug).toBe('slug-resolved');
  });

  it('returns [] when no discovery_write steps are present', () => {
    const steps: ConverseStep[] = [{ type: 'reasoning', reasoning: 'thinking' }];
    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });

  it('keeps the input discovery_slug when the result carries no override', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-2',
        params: { kind: 'discovery', title: 'CPU spike', discovery_slug: 'original-slug' },
        results: [{ data: {} }],
      },
    ];
    const discoveries = extractDiscoveriesFromToolCall(steps);
    expect(discoveries[0].discovery_slug).toBe('original-slug');
  });
});

describe('extractSignificantEventsFromToolCall', () => {
  it('extracts significant events from events_write tool calls', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-1',
        params: {
          discovery_id: 'd-1',
          discovery_slug: 'slug-1',
          status: 'promoted',
          criticality: 80,
          confidence: 0.9,
          assessment_note: 'High confidence DB issue',
          evidences: [],
        },
      },
    ];
    const events = extractSignificantEventsFromToolCall(steps);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('promoted');
    expect(events[0].discovery_id).toBe('d-1');
  });

  it('returns [] when no events_write steps are present', () => {
    const steps: ConverseStep[] = [
      { type: 'reasoning', reasoning: 'thinking' },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-1',
        params: { kind: 'handled' },
      },
    ];
    expect(extractSignificantEventsFromToolCall(steps)).toEqual([]);
  });

  it('extracts multiple events from multiple events_write calls', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-1',
        params: { discovery_id: 'd-1', status: 'promoted' },
      },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-2',
        params: { discovery_id: 'd-2', status: 'demoted' },
      },
    ];
    const events = extractSignificantEventsFromToolCall(steps);
    expect(events).toHaveLength(2);
    expect(events[0].discovery_id).toBe('d-1');
    expect(events[1].discovery_id).toBe('d-2');
  });
});

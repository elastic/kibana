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
        params: { kind: 'discovery', title: 'DB latency spike', event_id: 'slug-from-input' },
        results: [{ data: { event_id: 'slug-resolved' } }],
      },
    ];
    const discoveries = extractDiscoveriesFromToolCall(steps);
    expect(discoveries).toHaveLength(1);
    expect(discoveries[0].title).toBe('DB latency spike');
    expect(discoveries[0].event_id).toBe('slug-resolved');
  });

  it('returns [] when no discovery_write steps are present', () => {
    const steps: ConverseStep[] = [{ type: 'reasoning', reasoning: 'thinking' }];
    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });

  it('keeps the input event_id when the result carries no override', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-2',
        params: { kind: 'discovery', title: 'CPU spike', event_id: 'original-slug' },
        results: [{ data: {} }],
      },
    ];
    const discoveries = extractDiscoveriesFromToolCall(steps);
    expect(discoveries[0].event_id).toBe('original-slug');
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
          event_id: 'slug-1',
          status: 'open',
          severity: '60-high',
          confidence: 0.9,
          assessment_note: 'High confidence DB issue',
          signals: [],
        },
      },
    ];
    const events = extractSignificantEventsFromToolCall(steps);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('open');
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
        params: { discovery_id: 'd-1', status: 'open', severity: '80-critical' },
      },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-2',
        params: { discovery_id: 'd-2', status: 'dismissed', severity: '20-low' },
      },
    ];
    const events = extractSignificantEventsFromToolCall(steps);
    expect(events).toHaveLength(2);
    expect(events[0].discovery_id).toBe('d-1');
    expect(events[1].discovery_id).toBe('d-2');
  });
});

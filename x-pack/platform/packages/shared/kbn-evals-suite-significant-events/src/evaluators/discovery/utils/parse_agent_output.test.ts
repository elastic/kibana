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
  it('returns [] when no discovery_write steps are present', () => {
    const steps: ConverseStep[] = [{ type: 'reasoning', reasoning: 'thinking' }];
    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });

  it('reports invalid bulk input parameters', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-invalid-params',
        params: { items: 'not-an-array' },
      },
    ];

    expect(() => extractDiscoveriesFromToolCall(steps)).toThrow(
      'discovery_write: expected params.items to be an array, got string'
    );
  });

  it('extracts aligned bulk results and omits failed items', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-bulk',
        params: {
          items: [
            { kind: 'discovery', title: 'Persisted discovery' },
            { kind: 'discovery', title: 'Failed discovery' },
          ],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-1',
                  discovery_id: 'discovery-1',
                  written: true,
                },
                { index: 1, event_id: 'event-2', written: false, reason: 'bulk_error' },
              ],
            },
          },
        ],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([
      expect.objectContaining({
        title: 'Persisted discovery',
        event_id: 'event-1',
        discovery_id: 'discovery-1',
      }),
    ]);
    expect(extractDiscoveriesFromToolCall(steps)[0]).not.toHaveProperty('written');
  });

  it('rejects misaligned discovery bulk results', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-misaligned',
        params: { items: [{ title: 'one' }, { title: 'two' }] },
        results: [{ data: { results: [] } }],
      },
    ];

    expect(() => extractDiscoveriesFromToolCall(steps)).toThrow(
      'discovery_write input and result arrays are not aligned'
    );
  });

  it('rejects reordered discovery bulk results', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_DISCOVERY_WRITE,
        tool_call_id: 'dw-reordered',
        params: { items: [{ title: 'first' }, { title: 'second' }] },
        results: [
          {
            data: {
              results: [
                {
                  index: 1,
                  event_id: 'event-2',
                  discovery_id: 'discovery-2',
                  written: true,
                },
                {
                  index: 0,
                  event_id: 'event-1',
                  discovery_id: 'discovery-1',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(() => extractDiscoveriesFromToolCall(steps)).toThrow(
      'discovery_write input and result arrays are not aligned'
    );
  });
});

describe('extractSignificantEventsFromToolCall', () => {
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

  it('extracts successful items from a bulk write and its partial-failure retry', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-bulk',
        params: {
          items: [
            { discovery_id: 'd-1', event_id: 'event-1' },
            { discovery_id: 'd-2', event_id: 'event-2' },
          ],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-1',
                  event_uuid: 'uuid-1',
                  written: true,
                },
                { index: 1, event_id: 'event-2', written: false, reason: 'bulk_error' },
              ],
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-retry',
        params: { items: [{ discovery_id: 'd-2', event_id: 'event-2' }] },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-2',
                  event_uuid: 'uuid-2',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractSignificantEventsFromToolCall(steps)).toEqual([
      expect.objectContaining({ discovery_id: 'd-1', event_uuid: 'uuid-1' }),
      expect.objectContaining({ discovery_id: 'd-2', event_uuid: 'uuid-2' }),
    ]);
    expect(extractSignificantEventsFromToolCall(steps)[0]).not.toHaveProperty('written');
  });

  it('rejects reordered event bulk results', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-reordered',
        params: {
          items: [
            { discovery_id: 'd-1', event_id: 'event-1' },
            { discovery_id: 'd-2', event_id: 'event-2' },
          ],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 1,
                  event_id: 'event-2',
                  event_uuid: 'uuid-2',
                  written: true,
                },
                {
                  index: 0,
                  event_id: 'event-1',
                  event_uuid: 'uuid-1',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(() => extractSignificantEventsFromToolCall(steps)).toThrow(
      'events_write input and result arrays are not aligned'
    );
  });
});

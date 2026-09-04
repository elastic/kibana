/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantEventSchema } from '.';

const event = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'stable-event-1',
  status: 'open' as const,
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium' as const,
  confidence: 0.8,
};

describe('significantEventSchema severity assessments', () => {
  it('accepts legacy events without severity assessments', () => {
    expect(significantEventSchema.safeParse(event).success).toBe(true);
  });

  it('retains multiple assessments from the same source without expires_at', () => {
    const result = significantEventSchema.parse({
      ...event,
      severity_assessments: [
        {
          source: 'discovery',
          severity: '40-medium',
          assessed_at: '2026-01-01T00:00:00.000Z',
        },
        {
          source: 'discovery',
          severity: '60-high',
          assessed_at: '2026-01-01T00:30:00.000Z',
        },
      ],
    });

    expect(result.severity_assessments).toHaveLength(2);
    expect(result.severity_assessments?.[0]).not.toHaveProperty('expires_at');
  });

  it('requires workflow_execution_id only for investigation assessments', () => {
    expect(
      significantEventSchema.safeParse({
        ...event,
        severity_assessments: [
          {
            source: 'investigation',
            severity: '20-low',
            assessed_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      }).success
    ).toBe(false);

    const discoveryResult = significantEventSchema.parse({
      ...event,
      severity_assessments: [
        {
          source: 'discovery',
          severity: '20-low',
          assessed_at: '2026-01-01T00:00:00.000Z',
          workflow_execution_id: 'not-allowed',
        },
      ],
    });
    expect(discoveryResult.severity_assessments?.[0]).not.toHaveProperty('workflow_execution_id');
  });
});

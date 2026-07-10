/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSignificantEventSeed } from './continuation_candidate';

describe('toSignificantEventSeed', () => {
  it('stamps event_id and derives rule_names and stream_names from detections', () => {
    const seed = toSignificantEventSeed({
      eventId: 'svc__cascade-aaaa1111-cycle-0',
      discovery: {
        discovery_slug: 'svc__cascade-aaaa1111',
        summary: 'cascade',
        root_cause: 'db down',
        title: 'Cascade',
        confidence: 0.8,
        criticality: 90,
        detections: [
          { rule_name: 'r1', rule_uuid: 'u1', stream_name: 'logs-a', kind: 'detection' },
          { rule_name: 'r2', rule_uuid: 'u2', stream_name: 'logs-b', kind: 'detection' },
          // duplicate stream — should be de-duped
          { rule_name: 'r3', rule_uuid: 'u3', stream_name: 'logs-a', kind: 'detection' },
        ],
      },
    });

    expect(seed.event_id).toBe('svc__cascade-aaaa1111-cycle-0');
    expect(seed.discovery_slug).toBe('svc__cascade-aaaa1111');
    expect(seed.status).toBe('promoted');
    expect(seed.rule_names).toEqual(['r1', 'r2', 'r3']);
    expect(seed.stream_names).toEqual(['logs-a', 'logs-b']);
    expect(seed.confidence).toBe(0.8);
    expect(seed.criticality).toBe(90);
  });

  it('falls back to event_id as slug when discovery_slug is missing', () => {
    const seed = toSignificantEventSeed({
      eventId: 'fallback-id',
      discovery: {},
    });

    expect(seed.discovery_slug).toBe('fallback-id');
    expect(seed.rule_names).toEqual([]);
    expect(seed.stream_names).toEqual(['unknown']);
  });

  it('always sets status to promoted', () => {
    const seed = toSignificantEventSeed({
      eventId: 'e1',
      discovery: { discovery_slug: 'svc__x' },
    });

    expect(seed.status).toBe('promoted');
  });
});

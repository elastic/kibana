/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatedSignificantEventQuerySchema } from '../api/significant_events';
import { SIGNIFICANT_EVENT_TYPES, isExpired, significantEventTypeSchema } from '.';

describe('isExpired', () => {
  it('is true for a past timestamp', () => {
    expect(isExpired('2020-01-01T00:00:00.000Z')).toBe(true);
  });

  it('is false for a future timestamp', () => {
    expect(isExpired('2099-01-01T00:00:00.000Z')).toBe(false);
  });
});

describe('significant event query category', () => {
  it('defines the canonical category values', () => {
    expect(SIGNIFICANT_EVENT_TYPES).toEqual([
      'operational',
      'configuration',
      'resource_health',
      'error',
      'security',
    ]);
    expect(significantEventTypeSchema.safeParse('error').success).toBe(true);
    expect(significantEventTypeSchema.safeParse('unsupported').success).toBe(false);
  });

  it('keeps category optional on the generated query wire schema', () => {
    const query = {
      type: 'match',
      title: 'Failures',
      description: 'Detects failures',
      esql: { query: 'FROM logs | WHERE message == "failure"' },
      severity_score: 60,
      features: [],
    };

    expect(generatedSignificantEventQuerySchema.safeParse(query).success).toBe(true);
    expect(
      generatedSignificantEventQuerySchema.safeParse({ ...query, category: 'error' }).success
    ).toBe(true);
    expect(
      generatedSignificantEventQuerySchema.safeParse({ ...query, category: 'unsupported' }).success
    ).toBe(false);
  });
});

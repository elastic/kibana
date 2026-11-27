/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSLOGlobalSettingsResponseSchema,
  putSLOGlobalSettingsParamsSchema,
} from './global_settings';

describe('putSLOGlobalSettingsParamsSchema', () => {
  const parse = (sliRetention: object) =>
    putSLOGlobalSettingsParamsSchema.safeParse({ body: { sliRetention } });

  it('accepts a full SLI retention block within the bounds', () => {
    expect(parse({ enabled: true, periodDays: 180 }).success).toBe(true);
    expect(parse({ enabled: false, periodDays: 3650 }).success).toBe(true);
  });

  it.each([
    ['a period below the minimum', { enabled: true, periodDays: 179 }],
    ['a period above the maximum', { enabled: true, periodDays: 3651 }],
    ['a non-integer period', { enabled: true, periodDays: 200.5 }],
    ['a missing enabled flag', { periodDays: 200 }],
    ['a missing period', { enabled: true }],
  ])('rejects %s', (_, sliRetention) => {
    expect(parse(sliRetention).success).toBe(false);
  });

  it('rejects a missing SLI retention block', () => {
    expect(putSLOGlobalSettingsParamsSchema.safeParse({ body: {} }).success).toBe(false);
  });
});

describe('getSLOGlobalSettingsResponseSchema', () => {
  it('encodes the saved date as an ISO string', () => {
    expect(
      getSLOGlobalSettingsResponseSchema.encode({
        sliRetention: {
          enabled: true,
          periodDays: 200,
          updatedAt: new Date('2026-11-20T10:00:00.000Z'),
          effective: { enabled: true, periodDays: 200, source: 'settings' },
        },
      })
    ).toEqual({
      sliRetention: {
        enabled: true,
        periodDays: 200,
        updatedAt: '2026-11-20T10:00:00.000Z',
        effective: { enabled: true, periodDays: 200, source: 'settings' },
      },
    });
  });

  it('accepts a null saved date when the settings were never saved', () => {
    const result = getSLOGlobalSettingsResponseSchema.safeParse({
      sliRetention: {
        enabled: false,
        periodDays: 365,
        updatedAt: null,
        effective: { enabled: false, periodDays: 365, source: 'default' },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown effective source', () => {
    const result = getSLOGlobalSettingsResponseSchema.safeParse({
      sliRetention: {
        enabled: false,
        periodDays: 365,
        updatedAt: null,
        effective: { enabled: false, periodDays: 365, source: 'other' },
      },
    });

    expect(result.success).toBe(false);
  });
});

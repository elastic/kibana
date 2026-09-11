/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectUnitComponentIds,
  findDuplicateUnitComponentIds,
  streamsUnitSchema,
  streamsUnitSecretsSchema,
  streamsUnitUpsertRequestSchema,
  type StreamsUnit,
} from './unit';

const validUnit: StreamsUnit.Configuration = {
  sources: [
    {
      id: 'otlp-input',
      type: 'nop',
      supported_telemetry: ['logs'],
    },
  ],
  processors: [
    {
      id: 'add-env',
      type: 'add_fields',
      supported_telemetry: ['logs'],
    },
  ],
  destinations: [
    {
      id: 'es-prod',
      type: 'debug',
      supported_telemetry: ['logs'],
    },
  ],
};

describe('streams unit schema', () => {
  it('accepts units without destinations or processors', () => {
    expect(streamsUnitSchema.parse({ sources: validUnit.sources })).toEqual({
      sources: validUnit.sources,
    });
  });

  it('rejects invalid component identifiers', () => {
    expect(() =>
      streamsUnitSchema.parse({
        ...validUnit,
        sources: [
          {
            id: '_default_',
            type: 'nop',
            supported_telemetry: ['logs'],
          },
        ],
      })
    ).toThrow();
  });

  it('collects ids across component kinds', () => {
    expect(collectUnitComponentIds(validUnit).sort()).toEqual(
      ['add-env', 'es-prod', 'otlp-input'].sort()
    );
  });

  it('accepts an omitted secrets bag on upsert and rejects oversized maps', () => {
    expect(
      streamsUnitUpsertRequestSchema.parse({
        unit: { sources: validUnit.sources },
        ui_metadata: {},
      }).secrets
    ).toBeUndefined();
    expect(streamsUnitSecretsSchema.parse({ es_api_key: 's3cret' })).toEqual({
      es_api_key: 's3cret',
    });
    expect(() =>
      streamsUnitSecretsSchema.parse(
        Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`k${i}`, 'v']))
      )
    ).toThrow();
  });

  it('finds duplicate ids across component kinds', () => {
    expect(
      findDuplicateUnitComponentIds({
        ...validUnit,
        processors: [
          {
            id: 'otlp-input',
            type: 'add_fields',
            supported_telemetry: ['logs'],
          },
        ],
      })
    ).toEqual(['otlp-input']);
  });
});

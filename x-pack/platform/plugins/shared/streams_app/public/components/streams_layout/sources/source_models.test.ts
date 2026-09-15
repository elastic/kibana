/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { createUnitSource, getConfiguredSources, withUnitSources } from './source_models';

const storedUnit: StreamsUnit.GetResponse = {
  unit: {
    sources: [
      {
        id: 'otlp-input',
        name: 'Production OTLP',
        type: 'otlp',
        supported_telemetry: ['logs', 'traces'],
      },
      {
        id: 'file-drop',
        type: 'file',
        supported_telemetry: ['logs'],
      },
    ],
    processors: [{ id: 'add-env', type: 'add_fields', supported_telemetry: ['logs'] }],
    destinations: [{ id: 'es-prod', type: 'elasticsearch', supported_telemetry: ['logs'] }],
  },
  ui_metadata: { nodes: { 'add-env': { x: 1, y: 2 } } },
};

describe('source models', () => {
  it('maps configured sources from the unit and ignores unmanaged types', () => {
    expect(getConfiguredSources(storedUnit)).toEqual([
      {
        id: 'otlp-input',
        name: 'Production OTLP',
        type: 'otlp',
        to: null,
        config: { otlp: { signals: ['logs', 'traces'] } },
      },
    ]);
  });

  it('adds a source onto the unit without dropping processors, destinations, or unmanaged sources', () => {
    const existingSources = storedUnit.unit.sources ?? [];
    const next = withUnitSources(storedUnit, [
      ...existingSources,
      createUnitSource({ id: 'otlp-2', name: 'OTLP 2', type: 'otlp' }),
    ]);

    expect(next).toEqual({
      unit: {
        sources: [
          existingSources[0],
          existingSources[1],
          {
            id: 'otlp-2',
            name: 'OTLP 2',
            type: 'otlp',
            supported_telemetry: ['logs', 'metrics', 'traces'],
          },
        ],
        processors: storedUnit.unit.processors,
        destinations: storedUnit.unit.destinations,
      },
      ui_metadata: storedUnit.ui_metadata,
    });
  });
});

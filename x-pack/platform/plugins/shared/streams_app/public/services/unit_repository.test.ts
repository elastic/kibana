/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import type { StreamsUnit } from '@kbn/streams-schema';
import { createDefaultUnit, createUnitRepository } from './unit_repository';

const createNotFoundError = (): Error =>
  Object.assign(new Error('Streams unit [default] not found.'), {
    request: {},
    body: { statusCode: 404, message: 'Streams unit [default] not found.', error: 'Not Found' },
  });

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
    destinations: [{ id: 'es-prod', type: 'debug', supported_telemetry: ['logs'] }],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'processors', value: ['add-env'] },
          { name: 'destinations', value: ['es-prod'] },
        ],
      },
    ],
  },
  ui_metadata: { nodes: { 'add-env': { x: 1, y: 2 } } },
};

describe('unit repository', () => {
  it('loads a default unit when none is stored', async () => {
    const fetch = jest.fn().mockRejectedValue(createNotFoundError());
    const repository = createUnitRepository({
      streamsRepositoryClient: { fetch } as never,
    });

    await expect(repository.load()).resolves.toEqual(createDefaultUnit());
    expect(fetch).toHaveBeenCalledWith('GET /internal/streams/unit/{id}', {
      params: { path: { id: STREAMS_DEFAULT_UNIT_ID } },
      signal: null,
    });
  });

  it('puts the unit as the request body', async () => {
    const fetch = jest.fn().mockResolvedValue({ acknowledged: true });
    const repository = createUnitRepository({
      streamsRepositoryClient: { fetch } as never,
    });

    await expect(repository.persist(storedUnit)).resolves.toEqual(storedUnit);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('PUT /internal/streams/unit/{id}', {
      params: {
        path: { id: STREAMS_DEFAULT_UNIT_ID },
        body: storedUnit,
      },
      signal: null,
    });
  });

  it('wires a source, destination, and pipeline in the temporary default unit', () => {
    expect(createDefaultUnit()).toEqual({
      unit: {
        sources: [
          {
            id: 'nop-input',
            name: 'Nop',
            type: 'nop',
            supported_telemetry: ['logs', 'metrics', 'traces'],
          },
        ],
        destinations: [
          {
            id: 'debug-out',
            name: 'Debug',
            type: 'debug',
            supported_telemetry: ['logs', 'metrics', 'traces'],
          },
        ],
        pipelines: [
          {
            id: 'main',
            supported_telemetry: ['logs', 'metrics', 'traces'],
            config: [
              { name: 'sources', value: ['nop-input'] },
              { name: 'destinations', value: ['debug-out'] },
            ],
          },
        ],
      },
      ui_metadata: {},
    });
  });
});

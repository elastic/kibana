/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import type { StreamsUnit } from '@kbn/streams-schema';
import { createEmptyUnit, createUnitRepository } from './unit_repository';

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
    destinations: [{ id: 'es-prod', type: 'elasticsearch', supported_telemetry: ['logs'] }],
  },
  ui_metadata: { nodes: { 'add-env': { x: 1, y: 2 } } },
};

describe('unit repository', () => {
  it('loads an empty unit when none is stored', async () => {
    const fetch = jest.fn().mockRejectedValue(createNotFoundError());
    const repository = createUnitRepository({
      streamsRepositoryClient: { fetch } as never,
    });

    await expect(repository.load()).resolves.toEqual(createEmptyUnit());
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
});

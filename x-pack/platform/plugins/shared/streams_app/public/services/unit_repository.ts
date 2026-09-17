/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/server-route-repository-client';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsUnit } from '@kbn/streams-schema';

export type Unit = StreamsUnit.GetResponse;

export interface UnitRepository {
  load: () => Promise<Unit>;
  persist: (unit: Unit) => Promise<Unit>;
}

const DEFAULT_SOURCE_ID = 'otlp-input';
const DEFAULT_DESTINATION_ID = 'debug-out';
const DEFAULT_PIPELINE_ID = 'main';
const DEFAULT_SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'] as const;

/**
 * Temporary client-side default until the backend ships a canonical unit.
 * Used when GET `/internal/streams/unit/{id}` 404s, and as canvas / sources
 * table initial context before a stored unit exists.
 * TODO: Remove this once some sort of default exists: https://github.com/elastic/ingest-dev/issues/9178
 * OR the canvas can actually facilitate configuration of a full unit.
 */
export const createDefaultUnit = (): Unit => ({
  unit: {
    sources: [
      {
        id: DEFAULT_SOURCE_ID,
        name: 'OTLP',
        type: 'otlp',
        supported_telemetry: [...DEFAULT_SUPPORTED_TELEMETRY],
      },
    ],
    destinations: [
      {
        id: DEFAULT_DESTINATION_ID,
        name: 'Debug',
        type: 'debug',
        supported_telemetry: [...DEFAULT_SUPPORTED_TELEMETRY],
      },
    ],
    pipelines: [
      {
        id: DEFAULT_PIPELINE_ID,
        supported_telemetry: [...DEFAULT_SUPPORTED_TELEMETRY],
        config: [
          { name: 'sources', value: [DEFAULT_SOURCE_ID] },
          { name: 'destinations', value: [DEFAULT_DESTINATION_ID] },
        ],
      },
    ],
  },
  ui_metadata: {},
});

export const createUnitRepository = ({
  streamsRepositoryClient,
  unitId = STREAMS_DEFAULT_UNIT_ID,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  unitId?: string;
}): UnitRepository => ({
  load: async () => {
    try {
      return await streamsRepositoryClient.fetch('GET /internal/streams/unit/{id}', {
        params: { path: { id: unitId } },
        signal: null,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return createDefaultUnit();
      }
      throw error;
    }
  },
  persist: async (unit) => {
    await streamsRepositoryClient.fetch('PUT /internal/streams/unit/{id}', {
      params: {
        path: { id: unitId },
        body: unit,
      },
      signal: null,
    });

    return unit;
  },
});

const isNotFoundError = (error: unknown): boolean =>
  isHttpFetchError(error) && error.body?.statusCode === 404;

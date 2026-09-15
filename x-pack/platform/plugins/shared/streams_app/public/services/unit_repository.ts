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

export const createEmptyUnit = (): Unit => ({
  unit: {},
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
        return createEmptyUnit();
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

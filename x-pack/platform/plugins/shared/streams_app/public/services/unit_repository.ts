/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/server-route-repository-client';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsUnit } from '@kbn/streams-schema';

export type Unit = StreamsUnit.GetResponse;

export interface UnitRepository {
  load: () => Promise<Unit>;
  persist: (unit: Unit) => Promise<Unit>;
}

const DEFAULT_SOURCE_ID = 'nop-input';
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
        name: 'Nop',
        type: 'nop',
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
  toasts,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  unitId?: string;
  toasts?: ToastsStart;
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
    const response = await streamsRepositoryClient.fetch('PUT /internal/streams/unit/{id}', {
      params: {
        path: { id: unitId },
        body: unit,
      },
      signal: null,
    });

    if (response.api_keys_may_remain) {
      toasts?.addWarning({
        title: i18n.translate('xpack.streams.unitRepository.apiKeysMayRemainTitle', {
          defaultMessage: 'Some API keys may still be active',
        }),
        text: i18n.translate('xpack.streams.unitRepository.apiKeysMayRemainText', {
          defaultMessage:
            "Not all API keys for the removed sources or destinations could be revoked, for example keys created by other users. Revoke any that remain in Stack Management's API keys page.",
        }),
      });
    }

    if (response.ui_metadata_not_persisted) {
      toasts?.addWarning({
        title: i18n.translate('xpack.streams.unitRepository.uiMetadataNotPersistedTitle', {
          defaultMessage: 'Map layout could not be saved',
        }),
        text: i18n.translate('xpack.streams.unitRepository.uiMetadataNotPersistedText', {
          defaultMessage:
            'The unit was published, but the canvas layout could not be stored. Node positions may reset the next time the map loads.',
        }),
      });
    }

    return unit;
  },
});

const isNotFoundError = (error: unknown): boolean =>
  isHttpFetchError(error) && error.body?.statusCode === 404;

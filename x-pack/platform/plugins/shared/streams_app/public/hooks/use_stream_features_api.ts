/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { Streams } from '@kbn/streams-schema';
import type { FeaturesIdentificationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/features/route';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

interface StreamFeaturesApi {
  getFeaturesIdentificationStatus: () => Promise<FeaturesIdentificationTaskResult>;
  scheduleFeaturesIdentificationTask: (connectorId: string) => Promise<void>;
  cancelFeaturesIdentificationTask: () => Promise<void>;
  deleteFeature: (uuid: string) => Promise<void>;
  deleteFeaturesInBulk: (uuids: string[]) => Promise<void>;
}

export function useStreamFeaturesApi(definition: Streams.all.Definition): StreamFeaturesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      getFeaturesIdentificationStatus: async () => {
        return streamsRepositoryClient.fetch('GET /internal/streams/{name}/features/_status', {
          signal,
          params: {
            path: { name: definition.name },
          },
        });
      },
      scheduleFeaturesIdentificationTask: async (connectorId: string) => {
        const { from, to } = getLast24HoursTimeRange();
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_task', {
          signal,
          params: {
            path: { name: definition.name },
            body: {
              action: 'schedule',
              to,
              from,
              connector_id: connectorId,
            },
          },
        });
      },
      cancelFeaturesIdentificationTask: async () => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_task', {
          signal,
          params: {
            path: { name: definition.name },
            body: {
              action: 'cancel',
            },
          },
        });
      },
      deleteFeature: async (uuid: string) => {
        await streamsRepositoryClient.fetch('DELETE /internal/streams/{name}/features/{uuid}', {
          signal,
          params: {
            path: { name: definition.name, uuid },
          },
        });
      },
      deleteFeaturesInBulk: async (uuids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: definition.name },
            body: {
              operations: uuids.map((id) => ({ delete: { id } })),
            },
          },
        });
      },
    }),
    [streamsRepositoryClient, signal, definition.name]
  );
}

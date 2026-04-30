/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { WorkflowExecutionResult } from '@kbn/streams-plugin/server/lib/workflows/workflow_execution_client';
import { useKibana } from '../use_kibana';
import { getLast24HoursTimeRange } from '../../util/time_range';

interface StreamFeaturesApi {
  getFeaturesIdentificationExecution: () => Promise<WorkflowExecutionResult>;
  runFeaturesIdentification: () => Promise<WorkflowExecutionResult>;
  cancelFeaturesIdentification: () => Promise<void>;
  deleteFeature: (uuid: string) => Promise<void>;
  deleteFeaturesInBulk: (uuids: string[]) => Promise<void>;
  excludeFeaturesInBulk: (uuids: string[]) => Promise<void>;
  restoreFeaturesInBulk: (uuids: string[]) => Promise<void>;
}

export function useStreamFeaturesApi(streamName: string): StreamFeaturesApi {
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
      getFeaturesIdentificationExecution: async () => {
        return streamsRepositoryClient.fetch('GET /internal/streams/{name}/features/_execution', {
          signal,
          params: {
            path: { name: streamName },
          },
        });
      },
      runFeaturesIdentification: async () => {
        const { from, to } = getLast24HoursTimeRange();
        return streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_run', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              to,
              from,
            },
          },
        });
      },
      cancelFeaturesIdentification: async () => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_cancel', {
          signal,
          params: {
            path: { name: streamName },
          },
        });
      },
      deleteFeature: async (uuid: string) => {
        await streamsRepositoryClient.fetch('DELETE /internal/streams/{name}/features/{uuid}', {
          signal,
          params: {
            path: { name: streamName, uuid },
          },
        });
      },
      deleteFeaturesInBulk: async (uuids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              operations: uuids.map((id) => ({ delete: { id } })),
            },
          },
        });
      },
      excludeFeaturesInBulk: async (uuids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              operations: uuids.map((id) => ({ exclude: { id } })),
            },
          },
        });
      },
      restoreFeaturesInBulk: async (uuids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              operations: uuids.map((id) => ({ restore: { id } })),
            },
          },
        });
      },
    }),
    [streamsRepositoryClient, signal, streamName]
  );
}

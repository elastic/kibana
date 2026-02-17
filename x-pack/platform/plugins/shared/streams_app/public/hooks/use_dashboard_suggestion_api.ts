/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { Streams } from '@kbn/streams-schema';
import type { DashboardSuggestionTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/dashboard_suggestions/route';
import { useKibana } from './use_kibana';

interface DashboardSuggestionApi {
  getDashboardSuggestionStatus: () => Promise<DashboardSuggestionTaskResult>;
  scheduleDashboardSuggestionTask: (connectorId: string, guidance?: string) => Promise<void>;
  cancelDashboardSuggestionTask: () => Promise<void>;
  acknowledgeDashboardSuggestionTask: () => Promise<DashboardSuggestionTaskResult>;
}

export function useDashboardSuggestionApi(
  definition: Streams.all.Definition
): DashboardSuggestionApi {
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
      getDashboardSuggestionStatus: async () => {
        return streamsRepositoryClient.fetch(
          'GET /internal/streams/{name}/dashboard_suggestions/_status',
          {
            signal,
            params: {
              path: { name: definition.name },
            },
          }
        );
      },
      scheduleDashboardSuggestionTask: async (connectorId: string, guidance?: string) => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/dashboard_suggestions/_task',
          {
            signal,
            params: {
              path: { name: definition.name },
              body: {
                action: 'schedule',
                connector_id: connectorId,
                guidance,
              },
            },
          }
        );
      },
      cancelDashboardSuggestionTask: async () => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/dashboard_suggestions/_task',
          {
            signal,
            params: {
              path: { name: definition.name },
              body: {
                action: 'cancel',
              },
            },
          }
        );
      },
      acknowledgeDashboardSuggestionTask: async () => {
        return streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/dashboard_suggestions/_task',
          {
            signal,
            params: {
              path: { name: definition.name },
              body: {
                action: 'acknowledge',
              },
            },
          }
        );
      },
    }),
    [streamsRepositoryClient, signal, definition.name]
  );
}

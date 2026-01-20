/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

export function useInsightsApi() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return {
    scheduleInsightsIdentificationTask: async (connectorId: string) => {
      await streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
        signal,
        params: {
          body: {
            action: 'schedule',
            connectorId,
          },
        },
      });
    },
    getInsightsIdentificationTaskStatus: async () => {
      return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_status', {
        signal,
      });
    },
    cancelInsightsIdentificationTask: async () => {
      return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
        signal,
        params: {
          body: {
            action: 'cancel' as const,
          },
        },
      });
    },
    acknowledgeInsightsIdentificationTask: async () => {
      return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
        signal,
        params: {
          body: {
            action: 'acknowledge' as const,
          },
        },
      });
    },
  };
}

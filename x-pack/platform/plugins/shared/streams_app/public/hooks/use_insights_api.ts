/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

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
    scheduleInsightsIdentificationTask: async (streamNames: string[], connectorId: string) => {
      const { from, to } = getLast24HoursTimeRange();
      await streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
        signal,
        params: {
          body: {
            action: 'schedule',
            from,
            to,
            connectorId,
            streamNames,
          },
        },
      });
    },
    getInsightsIdentificationTaskStatus: async (streamNames: string[]) => {
      return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_status', {
        signal,
        params: {
          body: { streamNames },
        },
      });
    },
  };
}

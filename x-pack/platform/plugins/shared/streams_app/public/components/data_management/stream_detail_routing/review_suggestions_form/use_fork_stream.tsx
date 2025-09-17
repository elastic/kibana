/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { Condition } from '@kbn/streamlang';
import { useKibana } from '../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../hooks/use_streams_app_fetch';

export interface ForkStreamParams {
  parentName: string;
  name: string;
  condition: Condition;
}

export function useForkStream() {
  const {
    core: { notifications },
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();

  return useAsyncFn(
    async (params: ForkStreamParams) => {
      return streamsRepositoryClient
        .fetch('POST /api/streams/{name}/_fork 2023-10-31', {
          signal: abortController.signal,
          params: {
            path: { name: params.parentName },
            body: {
              where: params.condition,
              status: 'enabled',
              stream: {
                name: params.name,
              },
            },
          },
        })
        .catch((error) => {
          showErrorToast(notifications, error);
          throw error;
        });
    },
    [abortController, notifications, streamsRepositoryClient, telemetryClient]
  );
}

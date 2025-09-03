/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { type IdentifiedSystemGenerateResponse } from '@kbn/streams-schema';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';

type GenerateApi = (connectorId: string) => IdentifiedSystemGenerateResponse;

export function useDescriptionGenerateApi({ name }: { name: string }): GenerateApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useCallback(
    (connectorId: string) => {
      return streamsRepositoryClient.stream(
        `GET /api/streams/{name}/description/_generate 2023-10-31`,
        {
          signal,
          params: {
            path: { name },
            query: { connectorId },
          },
        }
      );
    },
    [streamsRepositoryClient, signal, name]
  );
}

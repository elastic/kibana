/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';

export const useStreamSystems = (definition: Streams.all.Definition) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch(`GET /internal/streams/{name}/systems`, {
        signal,
        params: {
          path: {
            name: definition.name,
          },
        },
      });
    },
    [definition.name, streamsRepositoryClient]
  );
};

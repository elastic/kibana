/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexMetadataResponse } from '@kbn/streams-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

export const useIndexMetadata = (indexName: string) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useStreamsAppFetch(
    ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/indices/{name}', {
        signal,
        params: { path: { name: indexName } },
      }),
    [indexName, streamsRepositoryClient]
  );
};

export type { IndexMetadataResponse };

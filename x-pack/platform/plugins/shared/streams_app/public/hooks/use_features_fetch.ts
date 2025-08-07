/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type StreamFeature } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useFeaturesFetch = ({ name }: { name: string }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async (req): Promise<StreamFeature[]> => {
      const response = await streamsRepositoryClient.fetch(
        'GET /api/streams/{name}/features 2023-10-31',
        {
          params: { path: { name } },
          signal: req.signal,
        }
      );
      return response.features;
    },
    [name, streamsRepositoryClient]
  );

  return result;
};

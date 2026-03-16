/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { Feature } from '@kbn/streams-schema';
import { groupBy } from 'lodash';
import { useKibana } from './use_kibana';

interface DiscoveryFeaturesApi {
  deleteFeaturesInBulk: (features: Feature[]) => Promise<void>;
}

export function useDiscoveryFeaturesApi(): DiscoveryFeaturesApi {
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
      deleteFeaturesInBulk: async (features: Feature[]) => {
        const featuresByStream = groupBy(features, 'stream_name');

        await Promise.all(
          Object.entries(featuresByStream).map(([streamName, streamFeatures]) =>
            streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
              signal,
              params: {
                path: { name: streamName },
                body: {
                  operations: streamFeatures.map(({ uuid }) => ({ delete: { id: uuid } })),
                },
              },
            })
          )
        );
      },
    }),
    [streamsRepositoryClient, signal]
  );
}

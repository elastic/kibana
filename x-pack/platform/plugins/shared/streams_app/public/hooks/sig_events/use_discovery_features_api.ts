/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Feature } from '@kbn/streams-schema';
import { useKibana } from '../use_kibana';

export interface BulkOperationResult {
  succeededCount: number;
  failedCount: number;
}

interface DiscoveryFeaturesApi {
  deleteFeaturesInBulk: (features: Feature[]) => Promise<BulkOperationResult>;
}

export function useDiscoveryFeaturesApi(): DiscoveryFeaturesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useMemo(() => {
    return {
      deleteFeaturesInBulk: async (features: Feature[]): Promise<BulkOperationResult> => {
        if (features.length === 0) {
          return { succeededCount: 0, failedCount: 0 };
        }
        const { succeeded, failed } = await streamsRepositoryClient.fetch(
          'POST /internal/streams/features/_bulk',
          {
            signal: null,
            params: {
              body: { operations: features.map((feature) => ({ delete: { id: feature.id } })) },
            },
          }
        );
        return { succeededCount: succeeded, failedCount: failed };
      },
    };
  }, [streamsRepositoryClient]);
}

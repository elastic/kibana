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
import { useKibana } from '../use_kibana';

export interface BulkOperationResult {
  succeededCount: number;
  failedCount: number;
}

type FeatureBulkOperationItem =
  | { delete: { id: string } }
  | { exclude: { id: string } }
  | { restore: { id: string } };

type BulkOperation = (feature: Feature) => FeatureBulkOperationItem;

interface DiscoveryFeaturesApi {
  deleteFeaturesInBulk: (features: Feature[]) => Promise<BulkOperationResult>;
  excludeFeaturesInBulk: (features: Feature[]) => Promise<BulkOperationResult>;
  restoreFeaturesInBulk: (features: Feature[]) => Promise<BulkOperationResult>;
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

  return useMemo(() => {
    const executeBulkOperation = async (
      features: Feature[],
      operation: BulkOperation
    ): Promise<BulkOperationResult> => {
      const featuresByStream = groupBy(features, 'stream_name');
      const entries = Object.entries(featuresByStream);

      const results = await Promise.allSettled(
        entries.map(([streamName, streamFeatures]) =>
          streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
            signal,
            params: {
              path: { name: streamName },
              body: {
                operations: streamFeatures.map(operation),
              },
            },
          })
        )
      );

      let succeededCount = 0;
      let failedCount = 0;

      results.forEach((result, index) => {
        const count = entries[index][1].length;
        if (result.status === 'fulfilled') {
          succeededCount += count;
        } else {
          failedCount += count;
        }
      });

      return { succeededCount, failedCount };
    };

    return {
      deleteFeaturesInBulk: (features) =>
        executeBulkOperation(features, ({ uuid }) => ({ delete: { id: uuid } })),
      excludeFeaturesInBulk: (features) =>
        executeBulkOperation(features, ({ uuid }) => ({ exclude: { id: uuid } })),
      restoreFeaturesInBulk: (features) =>
        executeBulkOperation(features, ({ uuid }) => ({ restore: { id: uuid } })),
    };
  }, [streamsRepositoryClient, signal]);
}

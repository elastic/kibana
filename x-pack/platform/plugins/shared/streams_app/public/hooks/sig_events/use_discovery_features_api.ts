/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { Feature } from '@kbn/streams-schema';
import { useKibana } from '../use_kibana';

export interface BulkOperationResult {
  succeededCount: number;
  failedCount: number;
}

type PerStreamOperation = (
  feature: Feature
) => { exclude: { id: string } } | { restore: { id: string } };

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
    const deleteFeaturesInBulk = async (features: Feature[]): Promise<BulkOperationResult> => {
      if (features.length === 0) {
        return { succeededCount: 0, failedCount: 0 };
      }
      const operations = features.map((feature) => ({
        streamName: feature.stream_name,
        id: feature.uuid,
      }));
      const { succeeded, failed } = await streamsRepositoryClient.fetch(
        'POST /internal/streams/features/_bulk_delete',
        {
          signal: null,
          params: { body: { operations } },
        }
      );
      return { succeededCount: succeeded, failedCount: failed };
    };

    // exclude / restore are per-row actions (single feature per call). The
    // single-stream invariant is enforced to prevent silent client-side fan-out.
    const runPerStream = async (
      features: Feature[],
      operation: PerStreamOperation
    ): Promise<BulkOperationResult> => {
      if (features.length === 0) {
        return { succeededCount: 0, failedCount: 0 };
      }
      const firstStream = features[0].stream_name;
      if (features.some((f) => f.stream_name !== firstStream)) {
        throw new Error(
          'runPerStream requires all features to belong to the same stream. ' +
            'This API is single-stream only by design; add a cross-stream endpoint ' +
            'instead of fanning out from the client.'
        );
      }

      try {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: firstStream },
            body: {
              operations: features.map(operation),
            },
          },
        });
        return { succeededCount: features.length, failedCount: 0 };
      } catch {
        return { succeededCount: 0, failedCount: features.length };
      }
    };

    return {
      deleteFeaturesInBulk,
      excludeFeaturesInBulk: (features) =>
        runPerStream(features, ({ uuid }) => ({ exclude: { id: uuid } })),
      restoreFeaturesInBulk: (features) =>
        runPerStream(features, ({ uuid }) => ({ restore: { id: uuid } })),
    };
  }, [streamsRepositoryClient, signal]);
}

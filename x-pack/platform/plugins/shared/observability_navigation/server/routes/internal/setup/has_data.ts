/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
export async function hasData({
  scopedClusterClient,
}: {
  scopedClusterClient: IScopedClusterClient;
}) {
  const otelData = await scopedClusterClient.asCurrentUser.search({
    index: 'metrics-*.otel-*',
    ignore_unavailable: true,
    allow_no_indices: true,
    track_total_hits: true,
    terminate_after: 1,
    size: 0,
    query: {
      bool: {
        filter: [{ term: { ['data_stream.dataset']: 'k8sclusterreceiver.otel' } }],
      },
    },
  });

  const totalHits = otelData?.hits?.total;
  return typeof totalHits === 'number' ? totalHits !== 0 : totalHits?.value !== 0;
}

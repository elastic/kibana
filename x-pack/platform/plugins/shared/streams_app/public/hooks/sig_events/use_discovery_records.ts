/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../use_kibana';
import { useStreamsAppFetch } from '../use_streams_app_fetch';

export type DiscoveryKind = 'events' | 'detections' | 'discoveries' | 'verdicts';

const DEFAULT_SIZE = 100;

export function useDiscoveryRecords(kind: DiscoveryKind, refreshKey: number) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useStreamsAppFetch(
    ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_discovery_records', {
        params: { query: { kind, size: DEFAULT_SIZE } },
        signal,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, refreshKey, streamsRepositoryClient]
  );
}

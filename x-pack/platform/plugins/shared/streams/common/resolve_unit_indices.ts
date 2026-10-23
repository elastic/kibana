/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClassicIngestStreamEffectiveLifecycle,
  EffectiveFailureStore,
} from '@kbn/streams-schema';

/** Lifecycle and privileges are only reported for data streams; regular indices are listed without them. */
export type ResolvedDestinationIndex =
  | {
      name: string;
      is_data_stream: true;
      lifecycle: ClassicIngestStreamEffectiveLifecycle;
      /** True when enabled, or when the data stream lookup failed and it is unknown. */
      failure_store_enabled: boolean;
      privileges: { read_failure_store: boolean };
    }
  | { name: string; is_data_stream: false };

export interface ResolveUnitIndicesResponse {
  destinations: Record<string, { indices: ResolvedDestinationIndex[] }>;
}

interface IndexMetadataBase {
  name: string;
  privileges: {
    read_failure_store: boolean;
    monitor: boolean;
  };
}

/** Lifecycle and failure store are only reported for data streams. */
export type IndexMetadataResponse = IndexMetadataBase &
  (
    | {
        exists: true;
        is_data_stream: true;
        lifecycle: ClassicIngestStreamEffectiveLifecycle;
        effective_failure_store: EffectiveFailureStore;
      }
    | { exists: boolean; is_data_stream: false }
  );

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFailureMode } from '@kbn/ai-anonymization-common';

export interface InferenceAnonymizationOptions {
  /** Promise resolving per-space salt for deterministic tokenization. */
  saltPromise?: Promise<string | undefined>;
  /** Promise resolving how the pipeline should react if anonymization cannot run. Defaults to `block`. */
  onFailurePromise?: Promise<AnonymizationFailureMode>;
  replacements?: {
    esClient?: ElasticsearchClient;
    encryptionKeyPromise?: Promise<string | undefined>;
    usePersistentReplacements?: boolean;
    requireEncryptionKey?: boolean;
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutMappingRequest } from '@elastic/elasticsearch/lib/api/types';

/** One dataset to import. */
export interface HuggingFaceDatasetSpec {
  /** Human-readable name (purely for logging). */
  name: string;
  /** HuggingFace Hub repository id, e.g. "BeIR/msmarco" (required when `url` is omitted). */
  repo: string;
  /** File path inside the repo, e.g. "corpus.jsonl.gz" (required when `url` is omitted). */
  file: string;
  /** Optional revision (tag/branch/commit). Defaults to "main" when not provided. */
  revision?: string;
  /** Target Elasticsearch index. */
  index: string;
  mapping: Omit<IndicesPutMappingRequest, 'index'>;
  /**
   * Convert raw JSON objects into whatever you want stored.
   * Return value **must** include the doc‘s unique identifier
   * under `_id` (or change the code below).
   */
  mapDocument: (raw: any) => Record<string, unknown>;
}

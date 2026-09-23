/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

/**
 * Server-side dependencies threaded through the search path, as opposed to the caller's per-request
 * `SemanticLogSearchParams`. `rerankInferenceId` is here rather than there because it is an
 * operator's choice: `SemanticLogSearchParams` is public API and reaches an LLM-facing tool schema.
 */
export interface SemanticLogSearchDeps {
  logger: Logger;
  rerankInferenceId: string;
}

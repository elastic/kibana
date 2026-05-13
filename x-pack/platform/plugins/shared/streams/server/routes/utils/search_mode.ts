/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SEARCH_MODES } from '../../../common/queries';

export const searchModeSchema = z
  .enum(SEARCH_MODES)
  .optional()
  .describe(
    'Search mode: keyword (BM25), semantic (vector), or hybrid (RRF). When omitted, defaults to hybrid with a silent keyword fallback on failure. When set explicitly, failures propagate as errors.'
  );

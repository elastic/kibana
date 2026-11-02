/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_INDEX_NAME } from '../constants';
import { CASE_INDEX_MAPPING } from '../mappings/case';
import { ensureIndex, type EnsureIndexDeps } from './ensure_index';

/**
 * Bootstraps `.cases` (see `ensureIndex` for shared settings and failure policy).
 *
 * `index.mode: lookup` is required for `LOOKUP JOIN` from ES|QL on the
 * activity / attachments surfaces. Single primary shard; cases data fits
 * comfortably (millions of cases at ~2KB/doc is a few GB, well under
 * shard limits).
 */
export const ensureCaseIndex = (deps: EnsureIndexDeps): Promise<void> =>
  ensureIndex({
    ...deps,
    index: CASE_INDEX_NAME,
    mappings: CASE_INDEX_MAPPING,
    settings: { 'index.mode': 'lookup' },
  });

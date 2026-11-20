/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENTS_INDEX_NAME } from '../constants';
import { ATTACHMENTS_INDEX_MAPPING } from '../mappings/attachments';
import { ensureIndex, type EnsureIndexDeps } from './ensure_index';

/**
 * Bootstraps `.cases-attachments` (see `ensureIndex` for shared settings and failure policy).
 *
 * No `index.mode: lookup`: `.cases-attachments` is a fact table joined
 * to `.cases` via ES|QL `LOOKUP JOIN .cases ON case.id`; the
 * lookup-mode index is on the `.cases` side.
 */
export const ensureAttachmentsIndex = (deps: EnsureIndexDeps): Promise<void> =>
  ensureIndex({ ...deps, index: ATTACHMENTS_INDEX_NAME, mappings: ATTACHMENTS_INDEX_MAPPING });

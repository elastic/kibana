/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIVITY_INDEX_NAME } from '../constants';
import { ACTIVITY_INDEX_MAPPING } from '../mappings/activity';
import { ensureIndex, type EnsureIndexDeps } from './ensure_index';

/**
 * Bootstraps `.cases-activity` (see `ensureIndex` for shared settings and failure policy).
 *
 * No `index.mode: lookup`: `.cases-activity` is the fact table in the
 * analytics model. ES|QL queries
 * `FROM .cases-activity | LOOKUP JOIN .cases ON case.id`; the
 * lookup-mode index is on the `.cases` side.
 */
export const ensureActivityIndex = (deps: EnsureIndexDeps): Promise<void> =>
  ensureIndex({ ...deps, index: ACTIVITY_INDEX_NAME, mappings: ACTIVITY_INDEX_MAPPING });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addSearchStrategy } from '../../../../../../src/legacy/ui/public/courier';
import { rollupSearchStrategy } from './rollup_search_strategy';

export function initSearch() {
  addSearchStrategy(rollupSearchStrategy);
}

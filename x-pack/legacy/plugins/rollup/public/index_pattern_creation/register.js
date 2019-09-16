/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setup as managementSetup } from '../../../../../../src/legacy/core_plugins/management/public/legacy';
import { RollupIndexPatternCreationConfig } from './rollup_index_pattern_creation_config';

export function initIndexPatternCreation() {
  managementSetup.indexPattern.creation.add(RollupIndexPatternCreationConfig);
}

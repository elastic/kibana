/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EvalsSkillsStartDependencies } from '../../../types';

/** Services shared by every inline tool of the eval-dataset-management skill. */
export interface EvalDatasetManagementToolDeps {
  logger: Logger;
  getStartDependencies: () => Promise<EvalsSkillsStartDependencies>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { evalsRunSuiteCommonStepDefinition } from '../../common/workflows_steps/run_suite';

export const evalsRunSuiteStepDefinition = createPublicStepDefinition({
  ...evalsRunSuiteCommonStepDefinition,
});

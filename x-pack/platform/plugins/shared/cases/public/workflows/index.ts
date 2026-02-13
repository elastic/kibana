/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { getCaseStepDefinition } from './get_case';
import { createCreateCaseStepDefinition } from './create_case';
import { createUpdateCaseStepDefinition } from './update_case';
import { addCommentStepDefinition } from './add_comment';
import type { CasesPublicSetupDependencies } from '../types';

export function registerCasesSteps(
  core: CoreSetup,
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }
  workflowsExtensions.registerStepDefinition(getCaseStepDefinition);
  workflowsExtensions.registerStepDefinition(createCreateCaseStepDefinition(core));
  workflowsExtensions.registerStepDefinition(createUpdateCaseStepDefinition(core));
  workflowsExtensions.registerStepDefinition(addCommentStepDefinition);
}

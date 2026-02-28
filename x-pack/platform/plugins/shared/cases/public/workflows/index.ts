/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseStepDefinition } from './get_case';
import { createCreateCaseStepDefinition } from './create_case';
// import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';
import { createUpdateCaseStepDefinition } from './update_case';
import { addCommentStepDefinition } from './add_comment';
import type { CasesPublicSetupDependencies } from '../types';

export function registerCasesSteps(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerStepDefinition(getCaseStepDefinition);
  workflowsExtensions.registerStepDefinition(createCreateCaseStepDefinition());
  // Leaving this in for now. We need to get support for reflective value lookup first.
  // workflowsExtensions.registerStepDefinition(createCreateCaseFromTemplateStepDefinition());
  workflowsExtensions.registerStepDefinition(createUpdateCaseStepDefinition());
  workflowsExtensions.registerStepDefinition(addCommentStepDefinition);
}

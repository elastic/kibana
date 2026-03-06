/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';
import { createUpdateCasesStepDefinition } from './update_cases';
import { createSetCustomFieldStepDefinition } from './set_custom_field';
import { addCommentStepDefinition } from './add_comment';
import { findCasesStepDefinition } from './find_cases';

import type { CasesPublicSetupDependencies } from '../types';

export function registerCasesSteps(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerStepDefinition(() =>
    import('./get_case').then((m) => m.getCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./create_case').then((m) => m.createCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./update_case').then((m) => m.updateCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./add_comment').then((m) => m.addCommentStepDefinition)
  );

  // Leaving this in for now. We need to get support for reflective value lookup first.
  // workflowsExtensions.registerStepDefinition(createCreateCaseFromTemplateStepDefinition());
  workflowsExtensions.registerStepDefinition(createUpdateCasesStepDefinition());
  workflowsExtensions.registerStepDefinition(createSetCustomFieldStepDefinition());
  workflowsExtensions.registerStepDefinition(addCommentStepDefinition);
  workflowsExtensions.registerStepDefinition(findCasesStepDefinition);
}

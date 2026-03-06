/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';

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

  workflowsExtensions.registerStepDefinition(() =>
    import('./update_cases').then((m) => m.updateCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./set_custom_field').then((m) => m.setCustomFieldStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./find_cases').then((m) => m.findCasesStepDefinition)
  );

  // Leaving this in for now. We need to get support for reflective value lookup first.
  // workflowsExtensions.registerStepDefinition(createCreateCaseFromTemplateStepDefinition());
}

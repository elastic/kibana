/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';

import { addCommentStepDefinition } from './add_comment';
import { findCasesStepDefinition } from './find_cases';
import { createSetSeverityStepDefinition } from './set_severity';
import { createSetStatusStepDefinition } from './set_status';
import { createCloseCaseStepDefinition } from './close_case';
import { createAssignCaseStepDefinition } from './assign_case';
import { createUnassignCaseStepDefinition } from './unassign_case';
import { createAddAlertsStepDefinition } from './add_alerts';
import { createAddEventsStepDefinition } from './add_events';
import { createFindSimilarCasesStepDefinition } from './find_similar_cases';
import { createSetDescriptionStepDefinition } from './set_description';
import { createSetTitleStepDefinition } from './set_title';
import { createAddObservablesStepDefinition } from './add_observables';
import { createAddTagStepDefinition } from './add_tag';
import { createAddCategoryStepDefinition } from './add_category';
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
  workflowsExtensions.registerStepDefinition(addCommentStepDefinition);
  workflowsExtensions.registerStepDefinition(findCasesStepDefinition);
  workflowsExtensions.registerStepDefinition(createSetSeverityStepDefinition());
  workflowsExtensions.registerStepDefinition(createSetStatusStepDefinition());
  workflowsExtensions.registerStepDefinition(createCloseCaseStepDefinition());
  workflowsExtensions.registerStepDefinition(createAssignCaseStepDefinition());
  workflowsExtensions.registerStepDefinition(createUnassignCaseStepDefinition());
  workflowsExtensions.registerStepDefinition(createAddAlertsStepDefinition());
  workflowsExtensions.registerStepDefinition(createAddEventsStepDefinition());
  workflowsExtensions.registerStepDefinition(createFindSimilarCasesStepDefinition());
  workflowsExtensions.registerStepDefinition(createSetDescriptionStepDefinition());
  workflowsExtensions.registerStepDefinition(createSetTitleStepDefinition());
  workflowsExtensions.registerStepDefinition(createAddObservablesStepDefinition());
  workflowsExtensions.registerStepDefinition(createAddTagStepDefinition());
  workflowsExtensions.registerStepDefinition(createAddCategoryStepDefinition());
}

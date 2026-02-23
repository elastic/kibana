/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CasesServerSetupDependencies } from '../types';
import type { CasesClient } from '../client';

import { getCaseStepDefinition } from './steps/get_case';
import { createCaseStepDefinition } from './steps/create_case';
// import { createCaseFromTemplateStepDefinition } from './steps/create_case_from_template';
import { updateCaseStepDefinition } from './steps/update_case';
import { updateCasesStepDefinition } from './steps/update_cases';
import { setCustomFieldStepDefinition } from './steps/set_custom_field';
import { addCommentStepDefinition } from './steps/add_comment';
import { findCasesStepDefinition } from './steps/find_cases';

export function registerCaseWorkflowSteps(
  workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions'],
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerStepDefinition(getCaseStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(createCaseStepDefinition(getCasesClient));
  // TODO: enable once https://github.com/elastic/security-team/issues/15982 has been resolved
  // workflowsExtensions.registerStepDefinition(createCaseFromTemplateStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(updateCaseStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(updateCasesStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(setCustomFieldStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(addCommentStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(findCasesStepDefinition(getCasesClient));
}

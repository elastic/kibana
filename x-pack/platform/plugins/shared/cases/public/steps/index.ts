/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseByIdStepDefinition } from './get_case_by_id';
import { createCaseStepDefinition } from './create_case';
import type { CasesPublicSetupDependencies } from '../types';

export function registerCasesSteps(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }
  workflowsExtensions.registerStepDefinition(getCaseByIdStepDefinition);
  workflowsExtensions.registerStepDefinition(createCaseStepDefinition);
}

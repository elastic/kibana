/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CasesServerSetupDependencies } from '../types';
import type { CasesClient } from '../client';

import { getCaseByIdStepDefinition } from './steps/get_case_by_id';
import { createCaseStepDefinition } from './steps/create_case';

export function registerCaseWorkflowSteps(
  workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions'],
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerStepDefinition(getCaseByIdStepDefinition(getCasesClient));
  workflowsExtensions.registerStepDefinition(createCaseStepDefinition(getCasesClient));
}

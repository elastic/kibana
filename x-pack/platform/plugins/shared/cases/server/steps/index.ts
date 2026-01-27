/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { CasesServerSetupDependencies, CasesServerStartDependencies } from '../types';
import type { CasesClient } from '../client';

import { getCaseByIdStepDefinition } from './get_case_by_id';
import { createCaseStepDefinition } from './create_case';
export { getCasesClientFromStepsContext, createCasesStepHandler } from './utils';

export function registerCaseWorkflowSteps(
  core: CoreSetup<CasesServerStartDependencies>,
  workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions'],
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerStepDefinition(getCaseByIdStepDefinition(core, getCasesClient));
  workflowsExtensions.registerStepDefinition(createCaseStepDefinition(core, getCasesClient));
}

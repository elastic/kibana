/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CasesServerSetupDependencies } from '../../types';
import type { CasesClient } from '../../client';
import { createCasesWorkflowExecutionContextDefinitions } from './definition';

export const registerCasesWorkflowExecutionContext = (
  workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions'],
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
): void => {
  if (!workflowsExtensions) {
    return;
  }

  for (const definition of createCasesWorkflowExecutionContextDefinitions(getCasesClient)) {
    workflowsExtensions.registerExecutionContextDefinition(definition);
  }
};

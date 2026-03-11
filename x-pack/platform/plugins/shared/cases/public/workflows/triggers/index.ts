/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicSetupDependencies } from '../../types';
import { caseCreatedTriggerPublicDefinition } from './case_created';
import { caseUpdatedTriggerPublicDefinition } from './case_updated';
import { commentAddedTriggerPublicDefinition } from './comment_added';

export function registerCasesTriggerDefinitions(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerTriggerDefinition(caseCreatedTriggerPublicDefinition);
  workflowsExtensions.registerTriggerDefinition(caseUpdatedTriggerPublicDefinition);
  workflowsExtensions.registerTriggerDefinition(commentAddedTriggerPublicDefinition);
}

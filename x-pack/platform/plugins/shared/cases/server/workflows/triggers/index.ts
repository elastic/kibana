/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesServerSetupDependencies } from '../../types';
import {
  caseCreatedTriggerCommonDefinition,
  caseUpdatedTriggerCommonDefinition,
  caseStatusUpdatedTriggerCommonDefinition,
  attachmentsAddedTriggerCommonDefinition,
  commentsAddedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';

export function registerCaseWorkflowTriggers(
  workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerTriggerDefinition(caseCreatedTriggerCommonDefinition);
  workflowsExtensions.registerTriggerDefinition(caseUpdatedTriggerCommonDefinition);
  workflowsExtensions.registerTriggerDefinition(caseStatusUpdatedTriggerCommonDefinition);
  workflowsExtensions.registerTriggerDefinition(attachmentsAddedTriggerCommonDefinition);
  workflowsExtensions.registerTriggerDefinition(commentsAddedTriggerCommonDefinition);
}

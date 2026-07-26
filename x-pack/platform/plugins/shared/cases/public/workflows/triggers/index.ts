/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicSetupDependencies } from '../../types';

export function registerCasesTriggerDefinitions(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerTriggerDefinition(() =>
    import('./case_created').then((m) => m.caseCreatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./case_updated').then((m) => m.caseUpdatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./case_status_updated').then((m) => m.caseStatusUpdatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./attachments_added').then((m) => m.attachmentsAddedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./comments_added').then((m) => m.commentsAddedTriggerPublicDefinition)
  );
}

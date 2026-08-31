/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerInvestigationsWorkflowTriggers = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup | undefined
): void => {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (module) => module.investigationStartedTriggerCommonDefinition
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (module) => module.investigationCompletedTriggerCommonDefinition
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (module) => module.investigationFailedTriggerCommonDefinition
    )
  );
};

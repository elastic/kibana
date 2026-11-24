/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicTriggerRegistry } from '../trigger_registry';

export const registerInternalTriggerDefinitions = (
  triggerRegistry: PublicTriggerRegistry
): void => {
  triggerRegistry.register(() =>
    import('./workflow_execution_failed').then(
      (m) => m.workflowExecutionFailedPublicTriggerDefinition
    )
  );
};

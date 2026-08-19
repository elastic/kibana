/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the `ai.evals.*` step definitions that give the Workflows YAML editor
 * autocomplete/validation. Called synchronously from `setup()` so the loaders are
 * queued before the editor reads the registry.
 */
export const registerEvalsPublicWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.resolveDatasetPublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.executeTaskPublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.evaluateTracePublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.ingestScoresPublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.evaluateExamplePublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.evaluateDatasetPublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.startExperimentPublicStep)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.compareExperimentsPublicStep)
  );
};

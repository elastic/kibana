/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerInferenceWorkflowExtensions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../triggers').then((m) => m.beforeCompletionPublicTriggerDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../triggers').then((m) => m.afterCompletionPublicTriggerDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('../steps/ai/ai_prompt_step').then((m) => m.AiPromptStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('../steps/ai/ai_summarize_step').then((m) => m.AiSummarizeStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('../steps/ai/ai_classify_step').then((m) => m.AiClassifyStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('../steps/pii/ai_pii_step').then((m) => m.AiPiiStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('../steps/pii/transform_pii_restore_step').then(
      (m) => m.TransformPiiRestoreStepDefinition
    )
  );
};

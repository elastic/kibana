/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { conversationMetadataUpdatedTriggerCommonDefinition } from '../../common/workflows/triggers';

export async function registerWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  core: CoreSetup
) {
  workflowsExtensions.registerStepDefinition(() =>
    import('./run_agent_step').then((m) => m.createRunAgentStepDefinition(core))
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./rerank_step').then((m) => m.createRerankStepDefinition(core))
  );

  const [coreStart] = await core.getStartServices();
  const isExperimentalEnabled = coreStart.uiSettings.get<boolean>(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
  );

  if (isExperimentalEnabled) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./conversation_metadata').then((m) => m.getConversationMetadataStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./conversation_metadata').then((m) => m.updateConversationMetadataStepDefinition)
    );

    workflowsExtensions.registerTriggerDefinition(
      conversationMetadataUpdatedTriggerCommonDefinition
    );
  }
}

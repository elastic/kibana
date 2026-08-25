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
import { getConversationMetadataStepCommonDefinition } from '../../common/workflows/steps/get_conversation_metadata';
import { updateConversationMetadataStepCommonDefinition } from '../../common/workflows/steps/update_conversation_metadata';

export function registerWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  core: CoreSetup
): void {
  workflowsExtensions.registerStepDefinition(() =>
    import('./run_agent_step').then((m) => m.createRunAgentStepDefinition(core))
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./rerank_step').then((m) => m.createRerankStepDefinition(core))
  );

  // Returns undefined when the flag is off so the step registry skips registration.
  const ifExperimental = async <T>(definition: T): Promise<T | undefined> => {
    const [coreStart] = await core.getStartServices();
    const isEnabled = coreStart.uiSettings.get<boolean>(
      AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
    );
    return isEnabled ? definition : undefined;
  };

  workflowsExtensions.registerStepDefinition(() =>
    ifExperimental(getConversationMetadataStepCommonDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    ifExperimental(updateConversationMetadataStepCommonDefinition)
  );

  // The trigger registry does not support skipping registration via undefined (it throws),
  // so the trigger is always registered on the public side. Actual event emission is already
  // gated by the feature flag in the server-side event bridge.
  workflowsExtensions.registerTriggerDefinition(
    conversationMetadataUpdatedTriggerCommonDefinition
  );
}

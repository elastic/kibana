/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { registerImpactAttachmentTypes } from './impact/attachments';
import { registerImpactPublicStepDefinitions } from './impact/step_types';
import { registerInvestigationPublicStepDefinitions } from './investigations/step_types';
import { registerTemplate } from './conversation_templates/registry/register_template';
import { escalationTemplate } from './conversation_templates/templates/escalation/register';
import { investigationTemplate } from './conversation_templates/templates/investigation/register';
import type {
  AgenticInvestigationsPublicConfig,
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
  AgenticInvestigationsPublicSetupDependencies,
  AgenticInvestigationsPublicStartDependencies,
} from './types';

/**
 * Registers Impact workflow steps, the Impact attachment UI, and the conversation details flyout
 * UI of the `investigation` and `escalation` templates. Escalations, user profiles and the
 * connected investigation components are also consumed directly by a solution's UI.
 */
export class AgenticInvestigationsPublicPlugin
  implements
    Plugin<
      AgenticInvestigationsPublicPluginSetup,
      AgenticInvestigationsPublicPluginStart,
      AgenticInvestigationsPublicSetupDependencies,
      AgenticInvestigationsPublicStartDependencies
    >
{
  private readonly escalationsEnabled: boolean;

  constructor(context: PluginInitializerContext<AgenticInvestigationsPublicConfig>) {
    this.escalationsEnabled = context.config.get().escalations.enabled;
  }

  setup(
    _core: CoreSetup,
    { workflowsExtensions }: AgenticInvestigationsPublicSetupDependencies
  ): AgenticInvestigationsPublicPluginSetup {
    registerImpactPublicStepDefinitions(workflowsExtensions);
    registerInvestigationPublicStepDefinitions(workflowsExtensions);
    return {};
  }

  start(
    core: CoreStart,
    startDeps: AgenticInvestigationsPublicStartDependencies
  ): AgenticInvestigationsPublicPluginStart {
    const { agentBuilder } = startDeps;
    if (agentBuilder) {
      registerImpactAttachmentTypes(agentBuilder);
      registerTemplate({
        core,
        startDeps: { ...startDeps, agentBuilder },
        // Escalations are AlertZero-only for now: without them there is no escalation template,
        // and the investigation template has no escalate action.
        escalationsEnabled: this.escalationsEnabled,
        templates: this.escalationsEnabled
          ? [investigationTemplate, escalationTemplate]
          : [investigationTemplate],
      });
    }
    return {};
  }

  stop() {}
}

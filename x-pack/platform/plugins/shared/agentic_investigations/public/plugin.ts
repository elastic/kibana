/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { createFlyoutGroupedAttachmentsRegistry } from '@kbn/agentic-investigations-common';
import { registerEscalationConversationEventUiDefinitions } from './escalations/conversation_events';
import { registerImpactAttachmentTypes } from './impact/attachments';
import { registerSubjectAttachmentTypes } from './subjects/attachments';
import { registerHypothesesAttachmentTypes } from './hypotheses/attachments';
import { registerImpactPublicStepDefinitions } from './impact/step_types';
import { registerInvestigationPublicStepDefinitions } from './investigations/step_types';
import { registerWorkflowExecutionPublicStepDefinitions } from './workflow_execution/step_types';
import { registerTemplate } from './conversation_templates/registry/register_template';
import { escalationTemplate } from './conversation_templates/templates/escalation/register';
import { investigationTemplate } from './conversation_templates/templates/investigation/register';
import type {
  AgenticInvestigationsPublicConfig,
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
  AgenticInvestigationsPublicSetupDependencies,
  AgenticInvestigationsPublicStartDependencies,
  ImpactEntityOpener,
} from './types';

const LazyInvestigationCardComponent = React.lazy(async () => {
  const { InvestigationCard } = await import(
    './conversation_templates/templates/investigation/card'
  );
  return { default: InvestigationCard };
});

const LazyInvestigationCard: AgenticInvestigationsPublicPluginStart['InvestigationCard'] = (
  props
) =>
  React.createElement(
    React.Suspense,
    { fallback: null },
    React.createElement(LazyInvestigationCardComponent, props)
  );

/**
 * Registers Impact workflow steps, the impact, subject, and hypotheses attachment UI, and the
 * conversation details flyout UI of the `investigation` and `escalation` templates. Escalations,
 * user profiles and the connected investigation components are also consumed directly by a
 * solution's UI.
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
  private readonly groupedAttachments = createFlyoutGroupedAttachmentsRegistry();
  private impactEntityOpener: ImpactEntityOpener | undefined;

  constructor(context: PluginInitializerContext<AgenticInvestigationsPublicConfig>) {
    this.escalationsEnabled = context.config.get().escalations.enabled;
  }

  setup(
    _core: CoreSetup,
    { workflowsExtensions }: AgenticInvestigationsPublicSetupDependencies
  ): AgenticInvestigationsPublicPluginSetup {
    registerImpactPublicStepDefinitions(workflowsExtensions);
    registerInvestigationPublicStepDefinitions(workflowsExtensions);
    registerWorkflowExecutionPublicStepDefinitions(workflowsExtensions);
    return { registerFlyoutGroupedAttachment: this.groupedAttachments.register };
  }

  start(
    core: CoreStart,
    startDeps: AgenticInvestigationsPublicStartDependencies
  ): AgenticInvestigationsPublicPluginStart {
    const { agentBuilder } = startDeps;
    if (agentBuilder) {
      registerImpactAttachmentTypes(agentBuilder, () => this.impactEntityOpener);
      if (this.escalationsEnabled) {
        registerEscalationConversationEventUiDefinitions({
          conversationEvents: agentBuilder.conversationEvents,
          application: core.application,
        });
      }
      registerSubjectAttachmentTypes(agentBuilder);
      registerHypothesesAttachmentTypes(agentBuilder);
      registerTemplate({
        core,
        startDeps: { ...startDeps, agentBuilder },
        // Escalations are AlertZero-only for now: without them there is no escalation template,
        // and the investigation template has no escalate action.
        escalationsEnabled: this.escalationsEnabled,
        groupedAttachments: this.groupedAttachments,
        getImpactEntityOpener: () => this.impactEntityOpener,
        templates: this.escalationsEnabled
          ? [investigationTemplate, escalationTemplate]
          : [investigationTemplate],
      });
    }
    return {
      registerImpactEntityOpener: (opener) => {
        this.impactEntityOpener = opener;
      },
      InvestigationCard: LazyInvestigationCard,
    };
  }

  stop() {
    this.impactEntityOpener = undefined;
  }
}

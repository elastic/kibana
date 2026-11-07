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
import { registerInvestigationConversationEventUiDefinitions } from './investigations/conversation_events';
import { registerImpactAttachmentTypes } from './impact/attachments';
import type { AlertSubjectSnapshot } from '../common/subjects/subject';
import { registerSubjectAttachmentTypes } from './subjects/attachments';
import { registerHypothesesAttachmentTypes } from './hypotheses/attachments';
import { registerImpactPublicStepDefinitions } from './impact/step_types';
import { registerInvestigationPublicStepDefinitions } from './investigations/step_types';
import { registerWorkflowExecutionPublicStepDefinitions } from './workflow_execution/step_types';
import { registerTemplate } from './conversation_templates/registry/register_template';
import { registerCasesIntegration } from './cases_bridge/register_cases_integration';
import { setCaseBridgeHostServices } from './cases_bridge/host_components';
import { escalationTemplate } from './conversation_templates/templates/escalation/register';
import { investigationTemplate } from './conversation_templates/templates/investigation/register';
import type {
  AgenticInvestigationsPublicConfig,
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
  AgenticInvestigationsPublicSetupDependencies,
  AgenticInvestigationsPublicStartDependencies,
  ImpactEntityOpener,
  AlertFlyoutRegistration,
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
  private escalationsEnabled: boolean;
  /** Escalations are on in config; their timeline events stay registered so old ones render. */
  private readonly escalationsConfigured: boolean;
  private casesBridgeEnabled: boolean;
  private readonly groupedAttachments = createFlyoutGroupedAttachmentsRegistry();
  private impactEntityOpener: ImpactEntityOpener | undefined;
  private readonly alertFlyouts = new Map<string, AlertFlyoutRegistration>();

  constructor(context: PluginInitializerContext<AgenticInvestigationsPublicConfig>) {
    const config = context.config.get();
    this.escalationsConfigured = config.escalations.enabled;
    this.casesBridgeEnabled = config.cases?.enabled ?? false;
    // Opening a case replaces escalations, exactly as escalations configured off.
    this.escalationsEnabled = config.escalations.enabled && !this.casesBridgeEnabled;
  }

  setup(
    core: CoreSetup<AgenticInvestigationsPublicStartDependencies>,
    { workflowsExtensions, cases }: AgenticInvestigationsPublicSetupDependencies
  ): AgenticInvestigationsPublicPluginSetup {
    if (this.casesBridgeEnabled) {
      if (cases) {
        registerCasesIntegration({
          cases,
          getStartServices: core.getStartServices,
          uiSettings: core.uiSettings,
        });
      } else {
        // Without Cases there is nothing to open: keep escalations as they were.
        this.disableCasesBridge();
      }
    }
    registerImpactPublicStepDefinitions(workflowsExtensions);
    registerInvestigationPublicStepDefinitions(workflowsExtensions);
    registerWorkflowExecutionPublicStepDefinitions(workflowsExtensions);
    return {
      registerFlyoutGroupedAttachment: this.groupedAttachments.register,
      registerAlertFlyout: (source, registration) => {
        this.alertFlyouts.set(source, registration);
      },
    };
  }

  start(
    core: CoreStart,
    startDeps: AgenticInvestigationsPublicStartDependencies
  ): AgenticInvestigationsPublicPluginStart {
    const { agentBuilder } = startDeps;
    // The bridge needs Cases' agentic UI (Related tab, verdicts, the Opened from AlertZero filter).
    if (this.casesBridgeEnabled && startDeps.cases?.config.agenticEnabled !== true) {
      this.disableCasesBridge();
    }
    if (this.casesBridgeEnabled) {
      setCaseBridgeHostServices({ ...core, ...startDeps });
    }
    // Read where a subject renders, so a solution can register after this plugin starts.
    const getAlertFlyout = (source?: string, snapshot?: AlertSubjectSnapshot) => {
      const registration = source ? this.alertFlyouts.get(source) : undefined;
      return registration && (registration.canOpen?.(snapshot) ?? true)
        ? registration.Component
        : undefined;
    };
    if (agentBuilder) {
      registerImpactAttachmentTypes(agentBuilder, () => this.impactEntityOpener);
      registerInvestigationConversationEventUiDefinitions(agentBuilder.conversationEvents);
      if (this.escalationsConfigured) {
        registerEscalationConversationEventUiDefinitions({
          conversationEvents: agentBuilder.conversationEvents,
          application: core.application,
        });
      }
      registerSubjectAttachmentTypes(agentBuilder, {
        // The alert flyout renders shared alerting components that read core and their plugins
        // from this context, so core is passed whole.
        ...core,
        share: startDeps.share,
        data: startDeps.data,
        dataViews: startDeps.dataViews,
        expressions: startDeps.expressions,
        spaces: startDeps.spaces,
        unifiedDocViewer: startDeps.unifiedDocViewer,
        charts: startDeps.charts,
        getAlertFlyout,
      });
      registerHypothesesAttachmentTypes(agentBuilder);
      registerTemplate({
        core,
        startDeps: { ...startDeps, agentBuilder, getAlertFlyout },
        // Escalations are AlertZero-only for now: without them there is no escalation template,
        // and the investigation template has no escalate action.
        escalationsEnabled: this.escalationsEnabled,
        casesBridgeEnabled: this.casesBridgeEnabled,
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
      isCasesBridgeEnabled: this.casesBridgeEnabled,
      canCreateCases: () =>
        startDeps.cases?.helpers.canUseCases(['securitySolution']).create === true,
    };
  }

  private disableCasesBridge() {
    this.casesBridgeEnabled = false;
    this.escalationsEnabled = this.escalationsConfigured;
  }

  stop() {
    this.impactEntityOpener = undefined;
    this.alertFlyouts.clear();
  }
}

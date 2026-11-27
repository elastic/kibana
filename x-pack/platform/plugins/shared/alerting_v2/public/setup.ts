/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Container } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { PluginInitializer } from '@kbn/core-di-browser';
import type { CoreStart, StartServicesAccessor, AnalyticsServiceSetup } from '@kbn/core/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import { registerTriggerDefinitions } from './lib/workflow_extensions/register_trigger_definitions';
import { registerCreateAlertEventStep } from './lib/workflow_extensions/register_create_alert_event_step';
import { registerCreateSignalEventStep } from './lib/workflow_extensions/register_create_signal_event_step';
import { setKibanaServices } from './kibana_services';
import type { AlertingV2UIConfig } from './kibana_services';
import {
  AlertingV2RulesLocatorDefinition,
  AlertingV2RuleLibraryLocatorDefinition,
  AlertingV2EpisodesLocatorDefinition,
  AlertingV2ActionPoliciesLocatorDefinition,
  AlertingV2ExecutionHistoryLocatorDefinition,
} from '../common/locators';

/** Registers the plugin's share locators. */
const registerLocators = (share: SharePluginSetup): void => {
  share.url.locators.create(AlertingV2RulesLocatorDefinition);
  share.url.locators.create(AlertingV2RuleLibraryLocatorDefinition);
  share.url.locators.create(AlertingV2EpisodesLocatorDefinition);
  share.url.locators.create(AlertingV2ActionPoliciesLocatorDefinition);
  share.url.locators.create(AlertingV2ExecutionHistoryLocatorDefinition);
};

/** Resolves start services off the DI container and publishes them to the shared services registry. */
const wireKibanaServices = (coreStart: CoreStart, diContainer: Container): void => {
  const dashboardToken = PluginStart('dashboard');
  const dashboard = diContainer.isBound(dashboardToken)
    ? (diContainer.get(dashboardToken) as DashboardStart)
    : undefined;

  // Optional RuleFormServices field; used by ComposeDiscoverFlyout (CpsPicker), not artifacts UI.
  const cpsToken = PluginStart('cps');
  const cps = diContainer.isBound(cpsToken)
    ? (diContainer.get(cpsToken) as CPSPluginStart)
    : undefined;

  const configAccessor = diContainer.get<PluginInitializerContext<AlertingV2UIConfig>['config']>(
    PluginInitializer('config')
  );
  const { minimumScheduleInterval } = configAccessor.get<AlertingV2UIConfig>().rules;

  setKibanaServices({
    http: coreStart.http,
    notifications: coreStart.notifications,
    application: coreStart.application,
    uiSettings: coreStart.uiSettings,
    featureFlags: coreStart.featureFlags,
    data: diContainer.get(PluginStart('data')) as DataPublicPluginStart,
    dataViews: diContainer.get(PluginStart('dataViews')) as DataViewsPublicPluginStart,
    lens: diContainer.get(PluginStart('lens')) as LensPublicStart,
    expressions: diContainer.get(PluginStart('expressions')) as ExpressionsStart,
    uiActions: diContainer.get(PluginStart('uiActions')) as UiActionsStart,
    dashboard,
    cps,
    minimumScheduleInterval,
    container: diContainer,
  });
};

/** Registers the Agent Builder attachment types, lazily, when Agent Builder is available. */
const registerAgentBuilderAttachments = (diContainer: Container): void => {
  const agentBuilderToken = PluginStart('agentBuilder');
  if (!diContainer.isBound(agentBuilderToken)) {
    return;
  }

  const agentBuilder = diContainer.get(agentBuilderToken) as AgentBuilderPluginStart;
  import(
    /* webpackChunkName: "alerting_v2_rule_attachment" */
    './agent_builder/attachments/rule_attachment_definition'
  ).then(({ createRuleAttachmentDefinition, RULE_ATTACHMENT_TYPE: ruleAttachmentType }) => {
    agentBuilder.attachments.addAttachmentType(
      ruleAttachmentType,
      createRuleAttachmentDefinition({
        container: diContainer,
      })
    );
  });
  import(
    /* webpackChunkName: "alerting_v2_action_policy_attachment" */
    './agent_builder/attachments/action_policy_attachment_definition'
  ).then(
    ({
      createActionPolicyAttachmentDefinition,
      ACTION_POLICY_ATTACHMENT_TYPE: actionPolicyAttachmentType,
    }) => {
      agentBuilder.attachments.addAttachmentType(
        actionPolicyAttachmentType,
        createActionPolicyAttachmentDefinition({
          container: diContainer,
        })
      );
    }
  );
  import(
    /* webpackChunkName: "alerting_v2_alert_attachment" */
    './agent_builder/attachments/alert_attachment_definition'
  ).then(({ createAlertAttachmentDefinition, ALERT_ATTACHMENT_TYPE: alertAttachmentType }) => {
    agentBuilder.attachments.addAttachmentType(
      alertAttachmentType,
      createAlertAttachmentDefinition()
    );
  });
};

/**
 * The plugin's `OnSetup` hook: registers workflow extensions, change-history
 * telemetry, and share locators at setup, then wires the shared services
 * registry and Agent Builder attachments once start services are ready. Its
 * setup-stage dependencies are resolved declaratively by the `OnSetup` binding.
 */
export const registerOnSetup =
  (
    getStartServices: StartServicesAccessor,
    workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
    analytics: AnalyticsServiceSetup,
    share: SharePluginSetup
  ) =>
  (): void => {
    registerTriggerDefinitions(workflowsExtensions);
    registerCreateAlertEventStep(workflowsExtensions);
    registerCreateSignalEventStep(workflowsExtensions);

    // Register change-history telemetry event types once, lazily, to keep the
    // React UI out of the page-load bundle.
    void import('@kbn/change-history-ui/telemetry')
      .then(({ registerChangeHistoryTelemetryEvents }) => {
        registerChangeHistoryTelemetryEvents(analytics);
      })
      .catch(() => {
        // Telemetry registration must not break plugin setup.
      });

    registerLocators(share);

    getStartServices().then(([coreStart]) => {
      const diContainer = coreStart.injection.getContainer();

      wireKibanaServices(coreStart, diContainer);

      if (!isAlertingV2Enabled(coreStart)) {
        return;
      }

      registerAgentBuilderAttachments(diContainer);
    });
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 *
 * Each definition is registered as a loader so its module (and the EUI icon it
 * lazily imports) stays out of the plugin's page-load bundle and is only fetched
 * when the Workflows editor needs it.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_assigned').then((m) => m.alertAssignedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_unassigned').then((m) => m.alertUnassignedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_acked').then((m) => m.alertAckedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_unacked').then((m) => m.alertUnackedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_tagged').then((m) => m.alertTaggedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_snoozed').then((m) => m.alertSnoozedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_unsnoozed').then((m) => m.alertUnsnoozedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_activated').then((m) => m.alertActivatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_deactivated').then((m) => m.alertDeactivatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_created').then((m) => m.ruleCreatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_updated').then((m) => m.ruleUpdatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_deleted').then((m) => m.ruleDeletedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_enabled').then((m) => m.ruleEnabledTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_disabled').then((m) => m.ruleDisabledTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_events_generated').then(
      (m) => m.ruleEventsGeneratedTriggerPublicDefinition
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_execution_failed').then(
      (m) => m.ruleExecutionFailedTriggerPublicDefinition
    )
  );
}

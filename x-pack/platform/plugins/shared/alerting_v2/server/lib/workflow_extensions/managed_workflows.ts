/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATADOG_ALERT_TRANSLATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

export const ALERTING_V2_MANAGED_WORKFLOW_OWNER = 'alertingVTwo';
const DATADOG_ALERT_TRIGGER_ID = 'datadog.alert';

export const registerAlertingV2ManagedWorkflowOwner = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerManagedWorkflowOwner(ALERTING_V2_MANAGED_WORKFLOW_OWNER);
};

export const installAlertingV2ManagedWorkflows = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): Promise<void> => {
  const managedWorkflowsClient = await workflowsExtensions.initManagedWorkflowsClient(
    ALERTING_V2_MANAGED_WORKFLOW_OWNER
  );

  if (workflowsExtensions.getTriggerDefinition(DATADOG_ALERT_TRIGGER_ID)) {
    await managedWorkflowsClient.install(DATADOG_ALERT_TRANSLATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  }

  await managedWorkflowsClient.ready();
};

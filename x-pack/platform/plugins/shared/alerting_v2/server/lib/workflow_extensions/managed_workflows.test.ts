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
import {
  ALERTING_V2_MANAGED_WORKFLOW_OWNER,
  installAlertingV2ManagedWorkflows,
  registerAlertingV2ManagedWorkflowOwner,
} from './managed_workflows';

describe('alerting v2 managed workflows', () => {
  it('registers the alerting v2 plugin as an owner', () => {
    const workflowsExtensions = {
      registerManagedWorkflowOwner: jest.fn(),
    } as unknown as WorkflowsExtensionsServerPluginSetup;

    registerAlertingV2ManagedWorkflowOwner(workflowsExtensions);

    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(
      ALERTING_V2_MANAGED_WORKFLOW_OWNER
    );
  });

  it('installs the Datadog workflow globally when datadog.alert is registered', async () => {
    const managedWorkflowsClient = {
      install: jest.fn().mockResolvedValue(undefined),
      ready: jest.fn().mockResolvedValue(undefined),
    };
    const workflowsExtensions = {
      getTriggerDefinition: jest.fn().mockReturnValue({ id: 'datadog.alert' }),
      initManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    } as unknown as WorkflowsExtensionsServerPluginStart;

    await installAlertingV2ManagedWorkflows(workflowsExtensions);

    expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith(
      ALERTING_V2_MANAGED_WORKFLOW_OWNER
    );
    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      DATADOG_ALERT_TRANSLATION_WORKFLOW_ID,
      { spaceId: GLOBAL_WORKFLOW_SPACE_ID }
    );
    expect(managedWorkflowsClient.ready).toHaveBeenCalledTimes(1);
  });

  it('marks the owner ready without installing when datadog.alert is not registered', async () => {
    const managedWorkflowsClient = {
      install: jest.fn(),
      ready: jest.fn().mockResolvedValue(undefined),
    };
    const workflowsExtensions = {
      getTriggerDefinition: jest.fn().mockReturnValue(undefined),
      initManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    } as unknown as WorkflowsExtensionsServerPluginStart;

    await installAlertingV2ManagedWorkflows(workflowsExtensions);

    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(managedWorkflowsClient.ready).toHaveBeenCalledTimes(1);
  });
});

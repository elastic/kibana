/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server/workflows_management/workflows_management_api';
import type { NotificationGroup } from './types';

export async function dispatchWorkflow(
  group: NotificationGroup,
  request: KibanaRequest,
  workflowsManagement: WorkflowsManagementApi
): Promise<void> {
  const spaceId = 'default';

  const workflow = await workflowsManagement.getWorkflow(group.workflowId, 'default');
  if (!workflow) {
    return;
  }

  await workflowsManagement.runWorkflow(
    {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition as WorkflowYaml,
      yaml: workflow.yaml,
    },
    spaceId,
    group,
    request
  );
}

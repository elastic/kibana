/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowProvider } from '@kbn/context-engine-plugin/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

/**
 * Adapts the workflows management API to the port Context Engine applies automation improvements
 * through. Context Engine cannot depend on workflows itself — workflows depends on Agent Builder
 * SML, which depends on Context Engine — so this plugin, which already depends on both, bridges it.
 */
export const createWorkflowProvider = (
  workflowsManagement: WorkflowsManagementApi
): WorkflowProvider => ({
  async validate({ yaml, spaceId, request }) {
    const { valid, diagnostics } = await workflowsManagement.validateWorkflow(
      yaml,
      spaceId,
      request
    );

    return {
      valid,
      errors: diagnostics
        .filter(({ severity }) => severity === 'error')
        .map(({ message }) => message),
    };
  },

  async get({ workflowId, spaceId }) {
    const workflow = await workflowsManagement.getWorkflow(workflowId, spaceId);
    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      managed: workflow.managed === true,
      enabled: workflow.enabled,
    };
  },

  async create({ yaml, spaceId, request }) {
    const { id } = await workflowsManagement.createWorkflow({ yaml }, spaceId, request);
    return id;
  },

  async update({ workflowId, yaml, spaceId, request }) {
    await workflowsManagement.updateWorkflow(workflowId, { yaml }, spaceId, request);
  },

  async setEnabled({ workflowId, enabled, spaceId, request }) {
    await workflowsManagement.updateWorkflow(workflowId, { enabled }, spaceId, request);
  },

  async delete({ workflowId, spaceId, request }) {
    await workflowsManagement.deleteWorkflows([workflowId], spaceId, request);
  },
});

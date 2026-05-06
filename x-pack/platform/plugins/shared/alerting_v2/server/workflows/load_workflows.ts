/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import DEDUPLICATION_WORKFLOW_YAML from './rule_doctor_deduplication.yaml';

export const RULE_DOCTOR_DEDUP_WORKFLOW_ID = 'rule-doctor-deduplication';

const WORKFLOW_REGISTRY: Record<string, { id: string; yaml: string }> = {
  deduplication: { id: RULE_DOCTOR_DEDUP_WORKFLOW_ID, yaml: DEDUPLICATION_WORKFLOW_YAML },
};

export async function ensureRuleDoctorAnalysisWorkflow(
  type: string,
  managementApi: WorkflowsServerPluginSetup['management'],
  spaceId: string,
  request: KibanaRequest,
  logger: Logger
): Promise<WorkflowExecutionEngineModel> {
  const entry = WORKFLOW_REGISTRY[type];
  if (!entry) {
    throw new Error(`Unknown rule doctor analysis type: ${type}`);
  }
  return ensureWorkflow(entry.id, entry.yaml, managementApi, spaceId, request, logger);
}

export async function ensureWorkflow(
  workflowId: string,
  yaml: string,
  managementApi: WorkflowsServerPluginSetup['management'],
  spaceId: string,
  request: KibanaRequest,
  logger: Logger
): Promise<WorkflowExecutionEngineModel> {
  const existing = await managementApi.getWorkflow(workflowId, spaceId);

  if (existing) {
    if (existing.yaml !== yaml || !existing.enabled || !existing.valid) {
      await managementApi.updateWorkflow(workflowId, { yaml, enabled: true }, spaceId, request);
      logger.info(`Updated workflow ${workflowId}`);
    }
  } else {
    await managementApi.createWorkflow({ yaml, id: workflowId }, spaceId, request);
    await managementApi.updateWorkflow(workflowId, { yaml, enabled: true }, spaceId, request);
    logger.info(`Created workflow ${workflowId}`);
  }

  const workflow = (await managementApi.getWorkflow(workflowId, spaceId))!;

  return {
    id: workflow.id,
    name: workflow.name,
    enabled: true,
    definition: workflow.definition ?? undefined,
    yaml: workflow.yaml,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import DEDUPLICATION_WORKFLOW_YAML from './rule_doctor_deduplication.yaml';

export const RULE_DOCTOR_DEDUP_WORKFLOW_ID = 'rule-doctor-deduplication';

const WORKFLOW_UPDATE_PATCH: Partial<EsWorkflow> = {
  yaml: DEDUPLICATION_WORKFLOW_YAML,
  enabled: true,
};

export async function ensureRuleDoctorWorkflow(
  managementApi: WorkflowsServerPluginSetup['management'],
  spaceId: string,
  request: KibanaRequest,
  logger: Logger
): Promise<WorkflowExecutionEngineModel> {
  const existing = await managementApi.getWorkflow(RULE_DOCTOR_DEDUP_WORKFLOW_ID, spaceId);

  if (existing) {
    if (existing.yaml !== DEDUPLICATION_WORKFLOW_YAML || !existing.enabled || !existing.valid) {
      await managementApi.updateWorkflow(
        RULE_DOCTOR_DEDUP_WORKFLOW_ID,
        WORKFLOW_UPDATE_PATCH,
        spaceId,
        request
      );
      logger.info(`Updated rule doctor workflow ${RULE_DOCTOR_DEDUP_WORKFLOW_ID}`);
    }
  } else {
    await managementApi.createWorkflow(
      { yaml: DEDUPLICATION_WORKFLOW_YAML, id: RULE_DOCTOR_DEDUP_WORKFLOW_ID },
      spaceId,
      request
    );
    await managementApi.updateWorkflow(
      RULE_DOCTOR_DEDUP_WORKFLOW_ID,
      WORKFLOW_UPDATE_PATCH,
      spaceId,
      request
    );
    logger.info(`Created rule doctor workflow ${RULE_DOCTOR_DEDUP_WORKFLOW_ID}`);
  }

  const workflow =
    existing ?? (await managementApi.getWorkflow(RULE_DOCTOR_DEDUP_WORKFLOW_ID, spaceId))!;

  return {
    id: workflow.id,
    name: workflow.name,
    enabled: true,
    definition: workflow.definition ?? undefined,
    yaml: workflow.yaml,
  };
}

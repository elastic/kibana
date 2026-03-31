/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ModelSettingsConfigClient } from '../sig_events/saved_objects/model_settings_config_service';

import {
  KI_SELECT_STREAMS_STEP_TYPE,
  KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
  COORDINATOR_INTERVAL_MINUTES,
  MAX_SCHEDULED_STREAMS,
} from '../../../common/constants';

const WORKFLOW_YAML = readFileSync(
  resolve(__dirname, 'continuous_extraction_workflow.yaml'),
  'utf-8'
);

const assertYamlInSync = (yaml: string, expected: string, label: string) => {
  if (!yaml.includes(expected)) {
    throw new Error(
      `continuous_extraction_workflow.yaml is out of sync: expected ${label} "${expected}" not found`
    );
  }
};

assertYamlInSync(WORKFLOW_YAML, KI_SELECT_STREAMS_STEP_TYPE, 'step type');
assertYamlInSync(WORKFLOW_YAML, KI_FEATURES_EXTRACT_STREAM_STEP_TYPE, 'step type');
assertYamlInSync(WORKFLOW_YAML, `timeout: "${COORDINATOR_INTERVAL_MINUTES - 1}m"`, 'timeout');
assertYamlInSync(
  WORKFLOW_YAML,
  `every: "${COORDINATOR_INTERVAL_MINUTES}m"`,
  'coordinator interval'
);
assertYamlInSync(
  WORKFLOW_YAML,
  `name: maxScheduledStreams\n    type: number\n    default: ${MAX_SCHEDULED_STREAMS}`,
  'maxScheduledStreams input'
);

export interface ContinuousExtractionWorkflowService {
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
    modelSettingsClient: ModelSettingsConfigClient;
  }): Promise<void>;
}

export const createContinuousExtractionWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ContinuousExtractionWorkflowService => {
  const log = logger.get('continuous-extraction-workflow');

  return {
    async ensureWorkflow({ enabled, request, spaceId, modelSettingsClient }) {
      const settings = await modelSettingsClient.getSettings();
      const existingWorkflowId = settings.continuousExtraction?.workflowId;

      if (existingWorkflowId) {
        const existing = await managementApi.getWorkflow(existingWorkflowId, spaceId);
        if (existing) {
          const yamlChanged = existing.yaml !== WORKFLOW_YAML;
          const enabledChanged = existing.enabled !== enabled;

          if (!yamlChanged && !enabledChanged) {
            log.debug(`Continuous extraction workflow ${existingWorkflowId} is already up to date`);
            return;
          }

          const patch: { yaml?: string; enabled?: boolean } = {};
          if (yamlChanged) patch.yaml = WORKFLOW_YAML;
          if (enabledChanged) patch.enabled = enabled;

          await managementApi.updateWorkflow(existingWorkflowId, patch, spaceId, request);

          log.info(`Updated continuous extraction workflow ${existingWorkflowId}`);
          return;
        }
        log.warn(`Stored workflow ID ${existingWorkflowId} not found, creating a new workflow`);
      }

      if (!enabled) {
        return;
      }

      const created = await managementApi.createWorkflow({ yaml: WORKFLOW_YAML }, spaceId, request);

      await managementApi.updateWorkflow(created.id, { enabled: true }, spaceId, request);

      await modelSettingsClient.updateSettings({
        continuousExtraction: { workflowId: created.id },
      });

      log.info(`Created continuous extraction workflow ${created.id}`);
    },
  };
};

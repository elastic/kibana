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
import { i18n } from '@kbn/i18n';
import type { ModelSettingsConfigClient } from '../sig_events/saved_objects/model_settings_config_service';

import {
  KI_SELECT_STREAMS_STEP_TYPE,
  KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
  COORDINATOR_INTERVAL_MINUTES,
} from '../../../common/constants';

const renderTemplate = (template: string, vars: Record<string, string>): string =>
  Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`<%= ${key} %>`, value),
    template
  );

const WORKFLOW_TEMPLATE = readFileSync(
  resolve(__dirname, 'continuous_extraction_workflow.yaml'),
  'utf-8'
);

const WORKFLOW_YAML = renderTemplate(WORKFLOW_TEMPLATE, {
  description: i18n.translate('xpack.streams.continuousExtraction.workflowDescription', {
    defaultMessage: 'This workflow is used by the system and should not be modified.',
  }),
  timeout: `${COORDINATOR_INTERVAL_MINUTES - 1}m`,
  coordinatorInterval: `${COORDINATOR_INTERVAL_MINUTES}m`,
  kiSelectStreamsStepType: KI_SELECT_STREAMS_STEP_TYPE,
  kiFeaturesExtractStreamStepType: KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
});

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
          if (existing.yaml === WORKFLOW_YAML && existing.enabled === enabled) {
            log.debug(`Continuous extraction workflow ${existingWorkflowId} is already up to date`);
            return;
          }
          await managementApi.updateWorkflow(
            existingWorkflowId,
            { yaml: WORKFLOW_YAML, enabled },
            spaceId,
            request
          );
          log.info(`Updated continuous extraction workflow ${existingWorkflowId}`);
          return;
        }
        log.warn(`Stored workflow ID ${existingWorkflowId} not found, creating a new workflow`);
      }

      if (!enabled) {
        return;
      }

      const created = await managementApi.createWorkflow({ yaml: WORKFLOW_YAML }, spaceId, request);

      await modelSettingsClient.updateSettings({
        continuousExtraction: { workflowId: created.id },
      });

      log.info(`Created continuous extraction workflow ${created.id}`);
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { i18n } from '@kbn/i18n';
import type { ModelSettingsConfigClient } from '../sig_events/saved_objects/model_settings_config_service';

import {
  KI_SELECT_STREAMS_STEP_TYPE,
  KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
  COORDINATOR_INTERVAL_MINUTES,
} from '../../../common/constants';

const COORDINATOR_INTERVAL = `${COORDINATOR_INTERVAL_MINUTES}m`;
const WORKFLOW_TIMEOUT = `${COORDINATOR_INTERVAL_MINUTES - 1}m`;

const WORKFLOW_DESCRIPTION = i18n.translate(
  'xpack.streams.continuousExtraction.workflowDescription',
  {
    defaultMessage: 'This workflow is used by the system and should not be modified.',
  }
);

const WORKFLOW_YAML = [
  `name: ".streams-continuous-ki-extraction"`,
  `description: '${WORKFLOW_DESCRIPTION}'`,
  `settings:`,
  `  timeout: "${WORKFLOW_TIMEOUT}"`,
  `  concurrency:`,
  `    key: streams-continuous-ki-extraction`,
  `    strategy: drop`,
  `    max: 1`,
  `triggers:`,
  `  - type: scheduled`,
  `    with:`,
  `      every: "${COORDINATOR_INTERVAL}"`,
  `steps:`,
  `  - name: select_streams`,
  `    type: ${KI_SELECT_STREAMS_STEP_TYPE}`,
  `    with: {}`,
  `  - name: has_scheduled_streams`,
  `    type: if`,
  `    condition: "steps.select_streams.output.scheduled[0].streamName:*"`,
  `    steps:`,
  `      - name: extract_ki_features`,
  `        type: foreach`,
  `        foreach: "{{ steps.select_streams.output.scheduled }}"`,
  `        iteration-on-failure:`,
  `          continue: true`,
  `        steps:`,
  `          - name: poll_ki_features_extraction`,
  `            type: ${KI_FEATURES_EXTRACT_STREAM_STEP_TYPE}`,
  `            with:`,
  `              streamName: "{{ foreach.item.streamName }}"`,
].join('\n');

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

  const disableById = async (workflowId: string, spaceId: string, request: KibanaRequest) => {
    const existing = await managementApi.getWorkflow(workflowId, spaceId);
    if (existing?.enabled) {
      await managementApi.updateWorkflow(workflowId, { enabled: false }, spaceId, request);
      log.info(`Disabled continuous extraction workflow ${workflowId}`);
    }
  };

  return {
    async ensureWorkflow({ enabled, request, spaceId, modelSettingsClient }) {
      const settings = await modelSettingsClient.getSettings();
      const existingWorkflowId = settings.continuousExtraction?.workflowId;

      if (!enabled) {
        if (existingWorkflowId) {
          await disableById(existingWorkflowId, spaceId, request);
        }
        return;
      }

      if (existingWorkflowId) {
        const existing = await managementApi.getWorkflow(existingWorkflowId, spaceId);
        if (existing) {
          await managementApi.updateWorkflow(
            existingWorkflowId,
            { yaml: WORKFLOW_YAML, enabled: true },
            spaceId,
            request
          );
          log.info(`Updated continuous extraction workflow ${existingWorkflowId}`);
          return;
        }
        log.warn(`Stored workflow ID ${existingWorkflowId} not found, creating a new workflow`);
      }

      const created = await managementApi.createWorkflow({ yaml: WORKFLOW_YAML }, spaceId, request);

      await modelSettingsClient.updateSettings({
        continuousExtraction: { workflowId: created.id },
      });

      log.info(`Created continuous extraction workflow ${created.id}`);
    },
  };
};

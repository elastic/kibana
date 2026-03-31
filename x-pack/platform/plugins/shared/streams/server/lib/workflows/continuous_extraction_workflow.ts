/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import {
  KI_SELECT_STREAMS_STEP_TYPE,
  KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
  COORDINATOR_INTERVAL_MINUTES,
  MAX_SCHEDULED_STREAMS,
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
} from '../../../common/constants';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

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
assertYamlInSync(
  WORKFLOW_YAML,
  `name: lookbackHours\n    type: number\n    default: 24`,
  'lookbackHours input'
);
assertYamlInSync(
  WORKFLOW_YAML,
  `name: extractionIntervalHours\n    type: number\n    default: ${DEFAULT_EXTRACTION_INTERVAL_HOURS}`,
  'extractionIntervalHours input'
);

export interface ContinuousKiExtractionWorkflowService {
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void>;
}

export const createContinuousKiExtractionWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ContinuousKiExtractionWorkflowService => {
  const log = logger.get('continuous-ki-extraction-workflow');

  return {
    async ensureWorkflow({ enabled, request, spaceId }) {
      const existing = await managementApi.getWorkflow(
        CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        spaceId
      );

      if (existing) {
        const yamlChanged = existing.yaml !== WORKFLOW_YAML;
        const enabledChanged = existing.enabled !== enabled;

        if (!yamlChanged && !enabledChanged) {
          log.debug(
            `Continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID} is already up to date`
          );
          return;
        }

        const patch: { yaml?: string; enabled?: boolean } = {};
        if (yamlChanged) patch.yaml = WORKFLOW_YAML;
        if (enabledChanged) patch.enabled = enabled;

        await managementApi.updateWorkflow(
          CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
          patch,
          spaceId,
          request
        );

        log.info(
          `Updated continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
        );
        return;
      }

      if (!enabled) {
        return;
      }

      await managementApi.createWorkflow(
        { yaml: WORKFLOW_YAML, id: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID },
        spaceId,
        request
      );

      await managementApi.updateWorkflow(
        CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        { enabled: true },
        spaceId,
        request
      );

      log.info(`Created continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
    },
  };
};

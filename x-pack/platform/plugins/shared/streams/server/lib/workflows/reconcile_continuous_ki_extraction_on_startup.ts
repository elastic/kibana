/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED } from '@kbn/management-settings-ids';
import type { TaskClient } from '../tasks/task_client';
import type { ContinuousKiExtractionWorkflowService } from './continuous_extraction_workflow';

/**
 * Ensures the continuous KI extraction workflow is created when the global
 * setting is already true (e.g. via kibana.yml globalOverrides) without
 * requiring a manual toggle through the settings API.
 */
export async function reconcileContinuousKiExtractionOnStartup({
  core,
  continuousKiExtractionWorkflowService,
  taskClient,
  logger,
}: {
  core: CoreStart;
  continuousKiExtractionWorkflowService: ContinuousKiExtractionWorkflowService;
  taskClient: TaskClient<string>;
  logger: Logger;
}): Promise<void> {
  const soClient = core.savedObjects.getUnsafeInternalClient();
  const globalUiSettingsClient = core.uiSettings.globalAsScopedToClient(soClient);

  const enabled = await globalUiSettingsClient.get<boolean>(
    OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
    false
  );

  if (!enabled) {
    return;
  }

  const fakeRequest = kibanaRequestFactory({
    headers: { 'x-elastic-internal-origin': 'kibana' },
    path: '/internal/streams/_significant_events/settings',
  });

  await continuousKiExtractionWorkflowService.ensureWorkflow({
    enabled: true,
    request: fakeRequest,
    taskClient,
  });

  logger.info('Reconciled continuous KI extraction workflow on startup');
}

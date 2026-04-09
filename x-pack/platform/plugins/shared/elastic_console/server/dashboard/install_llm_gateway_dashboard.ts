/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/dashboard-plugin/common/constants';
import { ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM } from '../telemetry/llm_gateway_telemetry';
import {
  ELASTIC_RAMEN_LLM_GATEWAY_DASHBOARD_ID,
  ELASTIC_RAMEN_LLM_GATEWAY_DATA_VIEW_ID,
} from './llm_gateway_dashboard_constants';
import { buildLlmGatewayDashboardPanelsJson } from './llm_gateway_dashboard_panels';

const DATA_VIEW_SAVED_OBJECT_TYPE = 'index-pattern';

function llmGatewayDashboardOptions(): string {
  return JSON.stringify({
    useMargins: true,
    syncColors: false,
    syncCursor: true,
    syncTooltips: false,
  });
}

/**
 * Installs a default-space data view + Lens dashboard for LLM gateway telemetry (idempotent).
 * If the dashboard saved object id already exists, does nothing.
 */
export async function installLlmGatewayDashboardIfMissing(
  coreStart: CoreStart,
  logger: Logger
): Promise<void> {
  const log = logger.get('llm_gateway_dashboard');
  const internalRepo = coreStart.savedObjects.createInternalRepository();
  const soClient = new SavedObjectsClient(internalRepo);

  const ensureDataView = async () => {
    try {
      await soClient.get(DATA_VIEW_SAVED_OBJECT_TYPE, ELASTIC_RAMEN_LLM_GATEWAY_DATA_VIEW_ID);
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
      await soClient.create(
        DATA_VIEW_SAVED_OBJECT_TYPE,
        {
          title: ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM,
          name: 'Elastic Ramen LLM gateway telemetry',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
        { id: ELASTIC_RAMEN_LLM_GATEWAY_DATA_VIEW_ID }
      );
    }
  };

  const lensPanelsJson = buildLlmGatewayDashboardPanelsJson(ELASTIC_RAMEN_LLM_GATEWAY_DATA_VIEW_ID);

  try {
    await soClient.get(DASHBOARD_SAVED_OBJECT_TYPE, ELASTIC_RAMEN_LLM_GATEWAY_DASHBOARD_ID);
    log.debug('LLM gateway telemetry dashboard already present; skipping install.');
    return;
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }
  }

  try {
    await ensureDataView();

    await soClient.create(
      DASHBOARD_SAVED_OBJECT_TYPE,
      {
        title: 'Elastic Ramen — LLM gateway telemetry',
        description:
          'Elastic Ramen OpenAI-compatible gateway: completions, tokens, cache split, models, outcomes, tool calls.',
        panelsJSON: lensPanelsJson,
        optionsJSON: llmGatewayDashboardOptions(),
        timeRestore: true,
        timeFrom: 'now-7d',
        timeTo: 'now',
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
      { id: ELASTIC_RAMEN_LLM_GATEWAY_DASHBOARD_ID }
    );

    log.info(
      `Installed LLM gateway telemetry dashboard (id: ${ELASTIC_RAMEN_LLM_GATEWAY_DASHBOARD_ID}).`
    );
  } catch (installErr) {
    const message = installErr instanceof Error ? installErr.message : String(installErr);
    log.error(`Could not install LLM gateway telemetry dashboard: ${message}`);
  }
}

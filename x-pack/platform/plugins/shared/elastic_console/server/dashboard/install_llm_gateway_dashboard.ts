/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/dashboard-plugin/common/constants';
import { ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM } from '../telemetry/llm_gateway_telemetry';
import {
  ELASTIC_RAMEN_LLM_GATEWAY_DASHBOARD_ID,
  ELASTIC_RAMEN_LLM_GATEWAY_DATA_VIEW_ID,
} from './llm_gateway_dashboard_constants';

const DATA_VIEW_SAVED_OBJECT_TYPE = 'index-pattern';

const markdownPanel = (content: string, grid: { x: number; y: number; w: number; h: number }) => {
  const panelId = uuidv4();
  return {
    type: 'DASHBOARD_MARKDOWN' as const,
    embeddableConfig: { content },
    panelIndex: panelId,
    gridData: {
      i: panelId,
      x: grid.x,
      y: grid.y,
      w: grid.w,
      h: grid.h,
    },
  };
};

/**
 * Installs a default-space data view + dashboard for LLM gateway telemetry (idempotent).
 */
export async function installLlmGatewayDashboardIfMissing(
  coreStart: CoreStart,
  logger: Logger
): Promise<void> {
  const log = logger.get('llm_gateway_dashboard');
  const internalRepo = coreStart.savedObjects.createInternalRepository();
  const soClient = new SavedObjectsClient(internalRepo);

  try {
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

    const panelsJSON = JSON.stringify([
      markdownPanel(
        `## Elastic Ramen — LLM gateway telemetry

Telemetry documents are indexed into data stream \`${ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM}\`.

**Fields (examples)**  
- \`gen_ai.usage.*\` — input, output, total, cache vs non-cached prompt tokens  
- \`elastic_ramen.*\` — connector, model, tool calls, outcome  
- \`event.outcome\` — success / failure

**Discover** (default space): open Discover, pick data view *Elastic Ramen LLM gateway telemetry*, or filter:

\`\`\`
data_stream.dataset:"elastic_ramen.llm_gateway"
\`\`\`

Add **Lens** panels from this data view for charts (requests over time, token sums, cache ratio, etc.).`,
        { x: 0, y: 0, w: 48, h: 18 }
      ),
    ]);

    await soClient.create(
      DASHBOARD_SAVED_OBJECT_TYPE,
      {
        title: 'Elastic Ramen — LLM gateway telemetry',
        description:
          'Pre-installed dashboard scaffold for Elastic Ramen OpenAI-compatible gateway usage.',
        panelsJSON,
        optionsJSON: JSON.stringify({
          useMargins: true,
          syncColors: false,
          syncCursor: true,
          syncTooltips: false,
        }),
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Could not install LLM gateway telemetry dashboard: ${message}`);
  }
}

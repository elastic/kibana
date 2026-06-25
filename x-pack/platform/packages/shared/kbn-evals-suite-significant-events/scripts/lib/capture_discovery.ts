/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

import type { ConnectionConfig } from './get_connection_config';
import { DISCOVERY_TIMEOUT_MS, DEFAULT_LOGS_INDEX } from './constants';
import {
  configureModelSelectionSettings,
  persistSigEventsDetectionsForSnapshot,
  persistSigEventsDiscoveriesForSnapshot,
  triggerSigEventsDiscovery,
  waitForSigEventsDiscovery,
} from './significant_events_workflow';

export interface CaptureDiscoveryResult {
  discoveriesIndex: string;
  discoveriesCount: number;
  detectionsIndex: string;
  detectionsCount: number;
}

export async function captureDiscoveryForScenario({
  config,
  esClient,
  log,
  connectorId,
  scenarioId,
  streamName = DEFAULT_LOGS_INDEX,
  timeoutMs = DISCOVERY_TIMEOUT_MS,
}: {
  config: ConnectionConfig;
  esClient: Client;
  log: ToolingLog;
  connectorId: string;
  scenarioId: string;
  streamName?: string;
  timeoutMs?: number;
}): Promise<CaptureDiscoveryResult> {
  // Idempotent — ensures the discovery feature resolves to the requested connector
  // (the otel-demo flow already configures it earlier).
  await configureModelSelectionSettings(config, log, connectorId);

  await triggerSigEventsDiscovery(config, log);
  await waitForSigEventsDiscovery(config, log, timeoutMs);

  const { index: discoveriesIndex, count: discoveriesCount } =
    await persistSigEventsDiscoveriesForSnapshot(config, esClient, log, scenarioId);
  const { index: detectionsIndex, count: detectionsCount } =
    await persistSigEventsDetectionsForSnapshot(config, esClient, log, scenarioId, streamName);

  return { discoveriesIndex, discoveriesCount, detectionsIndex, detectionsCount };
}

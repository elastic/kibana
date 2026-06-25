/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

import type { ConnectionConfig } from './get_connection_config';
import { DISCOVERY_TIMEOUT_MS } from './constants';
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

/**
 * Runs the server-side discovery workflow for a scenario and persists its output into the
 * dedicated `sigevents-discoveries-<scenario>` / `sigevents-detections-<scenario>` plain
 * indices — the same plain-index convention used for KI features.
 *
 * Triggers the discovery pipeline (which sources its own detections and runs the
 * investigator space-wide over the live data) and waits for completion. It does NOT create
 * the GCS snapshot — the caller folds the returned index names into a single snapshot
 * (mirroring how feature extraction persists before the one snapshot step).
 *
 * Used by the `--discovery` path of `capture_otel_demo_snapshots`. Requires the
 * scenario's data to be live in Elasticsearch (the workflow runs over it), so call it
 * before the scenario environment is torn down.
 */
export async function captureDiscoveryForScenario({
  config,
  esClient,
  log,
  connectorId,
  scenarioId,
  timeoutMs = DISCOVERY_TIMEOUT_MS,
}: {
  config: ConnectionConfig;
  esClient: Client;
  log: ToolingLog;
  connectorId: string;
  scenarioId: string;
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
    await persistSigEventsDetectionsForSnapshot(config, esClient, log, scenarioId);

  return { discoveriesIndex, discoveriesCount, detectionsIndex, detectionsCount };
}

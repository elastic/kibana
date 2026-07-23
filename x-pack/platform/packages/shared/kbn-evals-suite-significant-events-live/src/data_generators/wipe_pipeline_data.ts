/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DETECTIONS_DATA_STREAM,
  DISCOVERIES_DATA_STREAM,
  EVENTS_DATA_STREAM,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
} from '@kbn/evals-suite-significant-events';

/** Alerting v2 signal/alert events — the change-point scan's input. */
export const RULE_EVENTS_DATA_STREAM = '.rule-events';

const PIPELINE_DATA_STREAMS = [
  RULE_EVENTS_DATA_STREAM,
  DETECTIONS_DATA_STREAM,
  DISCOVERIES_DATA_STREAM,
  EVENTS_DATA_STREAM,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
] as const;

/**
 * Clear all documents from the significant-events pipeline data streams (signals, detections,
 * discoveries, events, knowledge indicators) so a scenario run only ever reads what it produced.
 * The streams themselves are left in place — they are owned by the product plugins.
 */
export async function wipePipelineData(esClient: Client, log: ToolingLog): Promise<void> {
  for (const index of PIPELINE_DATA_STREAMS) {
    try {
      const response = await esClient.deleteByQuery({
        index,
        query: { match_all: {} },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
      });
      log.debug(`wipePipelineData: deleted ${response.deleted ?? 0} doc(s) from ${index}`);
    } catch (error) {
      log.warning(
        `wipePipelineData: failed to clear ${index}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

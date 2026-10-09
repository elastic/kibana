/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EsqlToolCallSignal } from '../../common/http_api/signals';
import type { SignalsServiceApi } from '../signals/service';
import { build } from './transform';
import type { ExecuteToolSpan } from './transform';
import { classify } from './classify';
import {
  MAX_ROWS_PER_QUERY,
  buildConvAgentMap,
  queryExecuteToolSpans,
  queryInvokeAgentSpans,
  spaceFromTracesIndex,
} from './traces_repository';
import type { ToolSpanReadRow } from './traces_repository';

export interface SignalGeneratorTaskState {
  watermark?: string;
  [key: string]: unknown;
}

/** Groups tool spans by their originating space, dropping (and logging) rows with an unrecognized `_index`. */
const groupRowsBySpace = (
  rows: ToolSpanReadRow[],
  logger: Logger
): Map<string, ExecuteToolSpan[]> => {
  const bySpace = new Map<string, ExecuteToolSpan[]>();
  let skipped = 0;
  let sampleIndex = '';
  for (const row of rows) {
    const spaceId = spaceFromTracesIndex(row._index);
    if (!spaceId) {
      if (skipped === 0) {
        sampleIndex = row._index ?? '';
      }
      skipped += 1;
      continue;
    }
    const existing = bySpace.get(spaceId);
    if (existing) {
      existing.push(row);
    } else {
      bySpace.set(spaceId, [row]);
    }
  }
  if (skipped > 0) {
    logger.warn(
      `Skipping ${skipped} trace span(s) with an unrecognized _index (e.g. '${sampleIndex}')`
    );
  }
  return bySpace;
};

export interface GenerateSignalsDeps {
  esClient: ElasticsearchClient;
  signalsService: SignalsServiceApi;
  logger: Logger;
  state: SignalGeneratorTaskState;
  signal: AbortSignal;
}

/**
 * One run of the signal generator: reads new tool spans since the watermark, resolves each round's
 * agent, builds + classifies a signal per span, writes them per space, and returns the next state.
 *
 * The watermark advances to the batch's max `@timestamp` only when every space was fully processed,
 * so an abort or a per-space write failure holds the watermark and the batch is re-read next run
 * (idempotent overwrite via `signal_id`).
 */
export const generateSignals = async ({
  esClient,
  signalsService,
  logger,
  state,
  signal,
}: GenerateSignalsDeps): Promise<SignalGeneratorTaskState> => {
  const toolRows = await queryExecuteToolSpans(esClient, state.watermark, signal);
  if (toolRows.length === 0) {
    return state;
  }

  if (toolRows.length === MAX_ROWS_PER_QUERY) {
    logger.warn(
      `Signal generation read the per-run cap of ${MAX_ROWS_PER_QUERY} tool span(s); a backlog may be accumulating.`
    );
  }

  const traceIds = [
    ...new Set(toolRows.map((row) => row.trace_id).filter((id): id is string => !!id)),
  ];
  const agentRows = await queryInvokeAgentSpans(esClient, traceIds, signal);
  const convAgent = buildConvAgentMap(agentRows);

  let windowMax = '';
  for (const row of toolRows) {
    if (row['@timestamp'] > windowMax) {
      windowMax = row['@timestamp'];
    }
  }

  const rowsBySpace = groupRowsBySpace(toolRows, logger);

  let fullyProcessed = true;
  let total = 0;

  for (const [spaceId, spaceRows] of rowsBySpace) {
    if (signal.aborted) {
      fullyProcessed = false;
      break;
    }
    const signals: EsqlToolCallSignal[] = build({ toolRows: spaceRows, convAgent }).map(
      (produced) => ({
        ...produced,
        tags: classify(produced),
      })
    );
    try {
      await signalsService.write(spaceId, signals);
      total += signals.length;
    } catch (error) {
      fullyProcessed = false;
      logger.warn(
        `Failed to write signals for space '${spaceId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  logger.debug(
    `Generated ${total} signal(s) across ${rowsBySpace.size} space(s) from ${toolRows.length} tool span(s)`
  );

  return { watermark: fullyProcessed ? windowMax || undefined : state.watermark };
};

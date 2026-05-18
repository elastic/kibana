/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { isValidTraceId } from '@opentelemetry/api';
import pRetry from 'p-retry';
import type { Evaluator } from '../../types';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: any[][];
}

export interface TraceBasedEvaluatorConfig {
  name: string;
  // `traceIds` is always normalized to a non-empty array of valid trace IDs.
  // For single-round conversations it has length 1; for HITL-resume flows
  // where the agent_builder server's `mergeRounds` concatenates per-round
  // trace_ids, the array carries all of them so the query covers the full
  // conversation. Build the ES|QL WHERE clause with `traceIdInClause`
  // below (e.g. `WHERE ${traceIdInClause(traceIds)}`).
  buildQuery: (traceIds: string[]) => string;
  extractResult: (response: EsqlResponse) => number | null;
  // Optional validation for the extracted result. Return false to signal the trace data looks incomplete, which triggers a retry
  isResultValid?: (result: number | null) => boolean;
}

/**
 * Normalize the value the harness writes into `output.traceId`. The
 * agent_builder server's `mergeRounds`
 * (x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/utils/add_round_complete_event.ts)
 * flattens per-round trace_ids into `string[]` whenever a conversation
 * spans multiple HITL-prompt-resume rounds. Returning a clean string[]
 * lets every trace-based evaluator query the full conversation, not
 * just the first round.
 */
export function normalizeTraceIds(raw: unknown): string[] {
  const candidates =
    typeof raw === 'string'
      ? [raw]
      : Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];
  return candidates.filter((id) => isValidTraceId(id));
}

/**
 * Format a non-empty array of trace IDs as an ES|QL `trace.id IN (...)`
 * clause (or `trace.id == "..."` for the common single-trace case so
 * the produced query stays readable in logs). Escapes any double quotes
 * defensively even though `isValidTraceId` already rejects strings with
 * non-hex characters.
 */
export function traceIdInClause(traceIds: string[]): string {
  if (traceIds.length === 0) {
    throw new Error('traceIdInClause requires at least one trace ID');
  }
  if (traceIds.length === 1) {
    return `trace.id == "${traceIds[0].replace(/"/g, '\\"')}"`;
  }
  return `trace.id IN (${traceIds.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')})`;
}

export function createTraceBasedEvaluator({
  traceEsClient,
  log,
  config,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  config: TraceBasedEvaluatorConfig;
}): Evaluator {
  const { name, buildQuery, extractResult, isResultValid } = config;

  return {
    evaluate: async ({ output }) => {
      const rawTraceId = (output as any)?.traceId;

      if (!rawTraceId) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `No traceId available for ${name} evaluation`,
          metadata: undefined,
        };
      }

      const traceIds = normalizeTraceIds(rawTraceId);
      if (traceIds.length === 0) {
        log.error(`Invalid traceId for ${name} (traceId: ${JSON.stringify(rawTraceId)})`);
        return {
          score: null,
          label: 'error',
          explanation: 'Invalid traceId',
          metadata: undefined,
        };
      }

      let lastResult: number | null | undefined;

      async function fetchStats(): Promise<number> {
        const query = buildQuery(traceIds);
        const response = (await traceEsClient.esql.query({ query })) as unknown as EsqlResponse;

        const { values } = response;

        if (!values || values.length === 0) {
          throw new Error(`No data found for trace`);
        }

        const result = extractResult(response);
        lastResult = result;

        const valid = isResultValid ? isResultValid(result) : result !== null;
        if (!valid) {
          throw new Error(`${name} result looks incomplete (value: ${result}), retrying`);
        }

        return result as number;
      }

      try {
        const score = await pRetry(fetchStats, {
          retries: 5,
          factor: 2,
          minTimeout: 2000,
          maxTimeout: 60000,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.retriesLeft === 0;

            if (isLastAttempt) {
              log.error(
                new Error(`Failed to retrieve ${name} after ${error.attemptNumber} attempts`, {
                  cause: error,
                })
              );
            } else {
              log.warning(
                `${name} query failed on attempt ${error.attemptNumber}; retrying... (traceIds: ${traceIds.join(
                  ','
                )})`
              );
            }
          },
        });

        return {
          score,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (lastResult !== undefined) {
          log.warning(
            `${name} returning potentially incomplete result for traces ${traceIds.join(',')}: ${lastResult}`
          );
          return {
            score: lastResult,
            label: 'potentially_incomplete',
            explanation: `${name} may be based on incomplete trace data`,
            metadata: { incomplete: true },
          };
        }

        log.error(`Failed to evaluate ${name} for traces ${traceIds.join(',')}: ${errorMessage}`);
        return {
          label: 'error',
          explanation: `Failed to retrieve ${name}: ${errorMessage}`,
        };
      }
    },
    kind: 'CODE',
    name,
  };
}

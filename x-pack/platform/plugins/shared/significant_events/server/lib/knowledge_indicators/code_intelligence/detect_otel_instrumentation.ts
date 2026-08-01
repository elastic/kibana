/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isExcludedLoggingPath, OTEL_INSTRUMENTATION_PATTERNS } from './constants';
import { codeGrep, splitRepository } from './discover_logging_sites';
import type { OtelDetection, OtelSignalCounts } from './types';

export const EMPTY_OTEL_SIGNAL_COUNTS: OtelSignalCounts = {
  instrumentation_grpc: 0,
  instrumentation_http: 0,
  instrumentation_other: 0,
  start_span: 0,
  set_attribute: 0,
  add_event: 0,
  record_exception: 0,
  set_status_error: 0,
  create_metric: 0,
};

export interface DetectOtelInstrumentationOptions {
  esClient: ElasticsearchClient;
  repository: string;
  gitSha: string;
  serviceRoot: string;
  logger: Logger;
  perPatternLimit?: number;
}

/** Detects OTel imports and idiom sites for one service. Never throws. */
export async function detectOtelInstrumentation({
  esClient,
  repository,
  gitSha,
  serviceRoot,
  logger,
  perPatternLimit = 500,
}: DetectOtelInstrumentationOptions): Promise<OtelDetection> {
  const counts = { ...EMPTY_OTEL_SIGNAL_COUNTS };
  const { org, repo } = splitRepository(repository);
  const root = serviceRoot.replace(/^\.[/\\]?$/, '').replace(/\/+$/, '');
  const filePath = root ? `${root}/**` : '**';

  try {
    for (const [kind, patterns] of Object.entries(OTEL_INSTRUMENTATION_PATTERNS) as Array<
      [keyof OtelSignalCounts, readonly string[]]
    >) {
      const sites = new Set<string>();
      for (const regex of patterns) {
        const hits = await codeGrep({
          esClient,
          gitOrg: org,
          gitRepo: repo,
          gitCommit: gitSha || '*',
          filePath,
          regex,
          limit: perPatternLimit,
        });
        for (const hit of hits) {
          if (!isExcludedLoggingPath(hit.filePath)) {
            sites.add(`${hit.filePath}:${hit.lineNumber}`);
          }
        }
      }
      counts[kind] = sites.size;
    }
  } catch (error) {
    logger.debug(
      `otel_detection: grep failed for "${repository}" @ "${root}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { hasOtel: false, signalCounts: { ...EMPTY_OTEL_SIGNAL_COUNTS } };
  }

  const importsDetected =
    counts.instrumentation_grpc + counts.instrumentation_http + counts.instrumentation_other > 0;
  const idiomSites =
    counts.start_span +
    counts.set_attribute +
    counts.add_event +
    counts.record_exception +
    counts.set_status_error +
    counts.create_metric;
  return { hasOtel: importsDetected || idiomSites >= 3, signalCounts: counts };
}

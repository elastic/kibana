/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  CODE_ANALYSIS_FEATURE_TYPE,
  type Feature,
  type StreamQuery,
} from '@kbn/significant-events-schema';
import { getStreamSamplingSource, normalizeEsqlSafe, type Streams } from '@kbn/streams-schema';
import type { KnowledgeIndicatorClient, KIBulkOperation } from '../../streams/ki';
import { CODE_FEATURE_SUBTYPE_SERVICE_NAME } from './constants';
import { readCodeChangeState } from './code_change_state';
import { extractLogSignatures } from './extract_log_signatures';
import { generatePredictiveQueries } from './generate_predictive_queries';
import type { CodeRepositoryReader } from './types';

export type IdentifyCodeQueriesStatus = 'generated' | 'no_service' | 'no_repo' | 'no_signatures';

export interface IdentifyCodeQueriesResult {
  status: IdentifyCodeQueriesStatus;
  serviceName?: string;
  generatedCount?: number;
  queries?: StreamQuery[];
}

export interface IdentifyCodeQueriesOptions {
  stream: Streams.all.Definition;
  kiClient: KnowledgeIndicatorClient;
  reader: CodeRepositoryReader;
  logger: Logger;
}

/**
 * Stage 2 (code-driven): generate predictive Query KIs from the logger call
 * sites in a stream's SCS-indexed repository. Uses the resolved `service.name`
 * Feature KI from Stage 1 as the join key so queries are scoped to the right
 * service — including log lines that have not yet appeared in the data.
 *
 * Predictive queries are persisted as durable, non-rule-backed (draft) Query
 * KIs; promotion to alerting rules remains a separate, user-driven step.
 */
export async function identifyCodeQueries({
  stream,
  kiClient,
  reader,
  logger,
}: IdentifyCodeQueriesOptions): Promise<IdentifyCodeQueriesResult> {
  const streamName = stream.name;
  const { hits: codeFeatures } = await kiClient.getFeatures(streamName, {
    type: [CODE_ANALYSIS_FEATURE_TYPE],
  });

  const serviceFeature = codeFeatures.find(
    (feature) => feature.subtype === CODE_FEATURE_SUBTYPE_SERVICE_NAME
  );
  const serviceName =
    typeof serviceFeature?.properties?.service_name === 'string'
      ? serviceFeature.properties.service_name
      : undefined;

  if (!serviceName) {
    logger.debug(`code_queries: no resolved service name for stream "${streamName}"; skipping`);
    return { status: 'no_service' };
  }

  const { repository, fingerprint } = readCodeChangeState(codeFeatures);
  const resolvedRepository = repository ?? findRepositoryFromFeatures(codeFeatures);
  if (!resolvedRepository) {
    logger.debug(`code_queries: no repository resolved for stream "${streamName}"; skipping`);
    return { status: 'no_repo', serviceName };
  }

  const loggingChunks = await reader.getLoggingChunks(resolvedRepository);
  const signatures = loggingChunks.flatMap((chunk) => extractLogSignatures(chunk));

  if (signatures.length === 0) {
    logger.debug(`code_queries: no log signatures found for stream "${streamName}"`);
    return { status: 'no_signatures', serviceName };
  }

  const candidates = generatePredictiveQueries({
    serviceName,
    samplingSource: getStreamSamplingSource(stream),
    signatures,
    repository: resolvedRepository,
    fingerprint,
  });

  // De-duplicate against queries that already exist on the stream (any source).
  const { [streamName]: existingLinks } = await kiClient.getStreamToQueryLinksMap([streamName]);
  const existingEsql = new Set(
    existingLinks.map((link) => normalizeEsqlSafe(link.query.esql.query))
  );
  const newQueries = candidates.filter(
    (query) => !existingEsql.has(normalizeEsqlSafe(query.esql.query))
  );

  if (newQueries.length === 0) {
    logger.debug(`code_queries: all predictive queries already exist for stream "${streamName}"`);
    return { status: 'generated', serviceName, generatedCount: 0, queries: [] };
  }

  // Persist as durable (no `expires_at`) draft Query KIs; promotion is manual.
  const operations: KIBulkOperation[] = newQueries.map((query) => ({
    index: { query: { ...query, rule_backed: false } },
  }));
  await kiClient.bulk(streamName, operations);

  logger.debug(
    `code_queries: persisted ${newQueries.length} predictive query KI(s) for stream "${streamName}" (service "${serviceName}")`
  );

  return {
    status: 'generated',
    serviceName,
    generatedCount: newQueries.length,
    queries: newQueries,
  };
}

/** Falls back to the repository stamped on an existing code feature. */
function findRepositoryFromFeatures(features: Feature[]): string | undefined {
  for (const feature of features) {
    const repository = feature.properties?.repository;
    if (typeof repository === 'string' && repository.length > 0) {
      return repository;
    }
  }
  return undefined;
}

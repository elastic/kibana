/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { normalizeEsqlSafe } from '@kbn/streams-schema';
import type { KnowledgeIndicatorClient, KIBulkOperation } from '../knowledge_indicator_client';
import { extractLogSignatures } from './extract_log_signatures';
import { generatePredictiveQueries } from './generate_predictive_queries';
import {
  filterPredictiveBindings,
  resolveLogBearingStreams,
  type ServiceCodeMetadata,
  type StreamSamplingSource,
} from './link_ingesting_streams';
import type { LoggingChunk } from './types';

export type IdentifyCodeQueriesStatus =
  | 'generated'
  | 'no_service'
  | 'no_repo'
  | 'no_signatures'
  | 'no_ingesting';

export interface IdentifyCodeQueriesResult {
  status: IdentifyCodeQueriesStatus;
  serviceName?: string;
  generatedCount?: number;
  /** Real ingesting stream(s) the predictive queries were written to. */
  streams?: string[];
}

export interface IdentifyCodeQueriesOptions {
  /** The code KI key (service name) whose Stage 1 features drive query generation. */
  serviceName: string;
  /** GitHub repository containing the service. */
  repository: string;
  /** Immutable GitHub commit SHA used for evidence. */
  gitSha: string;
  /** Real streams (name + index) to resolve the service's ingesting stream from. */
  streams: StreamSamplingSource[];
  /** Code-derived service metadata used to safely narrow predictive fan-out. */
  metadata?: ServiceCodeMetadata;
  kiClient: KnowledgeIndicatorClient;
  loggingChunks: LoggingChunk[];
  esClient: ElasticsearchClient;
  logger: Logger;
}

/**
 * Stage 2 (code-driven): generate predictive Query KIs from the logger call
 * sites found by the GitHub research agent, targeting the **real stream(s)**
 * that ingest the service (e.g. `logs.otel`) with the concrete fields that
 * stream uses. Storing the queries on the ingesting stream — alongside any
 * log-derived queries — is what lets the per-stream reconciler merge code and
 * log KIs. Queries are predictive: they match log lines the code emits even
 * before those lines have appeared in the data.
 *
 * Persisted as durable, non-rule-backed (draft) Query KIs; promotion to
 * alerting rules remains a separate, user-driven step.
 */
export async function identifyCodeQueries({
  serviceName: serviceKey,
  repository,
  gitSha,
  streams,
  metadata,
  kiClient,
  loggingChunks,
  esClient,
  logger,
}: IdentifyCodeQueriesOptions): Promise<IdentifyCodeQueriesResult> {
  // The KI key is the service name; the service identity itself is represented as
  // an entity/service KI on the ingesting stream (not a code_analysis feature).
  const serviceName = serviceKey;
  const resolvedRepository = repository;
  const fingerprint = gitSha;

  const signatures = loggingChunks.flatMap((chunk) => extractLogSignatures(chunk));

  if (signatures.length === 0) {
    logger.debug(`code_queries: no log signatures found for service "${serviceName}"`);
    return { status: 'no_signatures', serviceName };
  }

  // Predictive queries need a real stream to target. Mirror the log pipeline:
  // target the log-bearing stream(s) and match on the message content (no
  // service field — log streams here carry no queryable service field).
  const bindings = filterPredictiveBindings(
    await resolveLogBearingStreams({ streams, esClient, logger }),
    metadata
  );

  if (bindings.length === 0) {
    logger.debug(
      `code_queries: no log-bearing stream found for service "${serviceName}"; skipping query generation`
    );
    return { status: 'no_ingesting', serviceName };
  }

  let generatedCount = 0;
  const writtenStreams: string[] = [];

  for (const binding of bindings) {
    const candidates = generatePredictiveQueries({
      serviceName,
      samplingSource: binding.index,
      signatures,
      repository: resolvedRepository,
      fingerprint,
      messageField: binding.messageField,
      messageIsText: binding.messageIsText,
    });

    // De-duplicate against queries already on this stream (any source).
    const { [binding.stream]: existingLinks } = await kiClient.getStreamToQueryLinksMap([
      binding.stream,
    ]);
    const existingEsql = new Set(
      existingLinks.map((link) => normalizeEsqlSafe(link.query.esql.query))
    );
    const newQueries = candidates.filter(
      (query) => !existingEsql.has(normalizeEsqlSafe(query.esql.query))
    );

    if (newQueries.length === 0) {
      continue;
    }

    const operations: KIBulkOperation[] = newQueries.map((query) => ({
      index: { query: { ...query, rule_backed: false } },
    }));
    await kiClient.bulk(binding.stream, operations);
    generatedCount += newQueries.length;
    writtenStreams.push(binding.stream);

    logger.debug(
      `code_queries: persisted ${newQueries.length} predictive query KI(s) on stream "${binding.stream}" for service "${serviceName}"`
    );
  }

  return {
    status: 'generated',
    serviceName,
    generatedCount,
    streams: writtenStreams,
  };
}

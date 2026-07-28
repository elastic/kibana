/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Parser, Walker } from '@elastic/esql';
import { QUERY_TYPE_MATCH, type StreamQuery } from '@kbn/significant-events-schema';
import { normalizeEsqlSafe } from '@kbn/streams-schema';
import { CODE_FEATURE_SUBTYPE_SERVICE_NAME } from './constants';
import type { LogSignature } from './types';

const MAX_TITLE_LENGTH = 80;

const escapeQuotes = (value: string): string => value.replace(/"/g, '\\"');

// Neutralize characters that are special inside an ES|QL double-quoted string or
// a LIKE pattern (quotes, backslashes, and the `*`/`?` wildcards). These are
// rare in real log message prefixes; collapsing them keeps the generated ES|QL
// unambiguously valid without fragile multi-level escaping.
const sanitizeForLike = (value: string): string =>
  value
    .replace(/["\\*?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toTitle = (staticPrefix: string): string =>
  staticPrefix.length > MAX_TITLE_LENGTH
    ? `${staticPrefix.slice(0, MAX_TITLE_LENGTH - 1)}…`
    : staticPrefix;

/**
 * Builds a predictive match query: it matches the log line the code emits, even
 * though it may not have occurred in the data yet. Mirrors how the log-derived
 * KI pipeline queries (message-based, no service field — log streams here have no
 * queryable service field; the message content is the signal). Includes
 * `METADATA _id, _source` as required for match queries.
 *
 * Field-aware `messageField` (default `message`): `text` fields use
 * `MATCH_PHRASE` (same operator the log pipeline uses on OTel `body.text`);
 * keyword fields use `LIKE "*prefix*"` (`LIKE` is invalid on `text`).
 */
export function buildPredictiveEsql({
  samplingSource,
  staticPrefix,
  messageField = 'message',
  messageIsText = false,
}: {
  samplingSource: string;
  staticPrefix: string;
  messageField?: string;
  messageIsText?: boolean;
}): string {
  const messageClause = messageIsText
    ? `MATCH_PHRASE(${messageField}, "${escapeQuotes(sanitizeForLike(staticPrefix))}")`
    : `${messageField} LIKE "*${sanitizeForLike(staticPrefix)}*"`;
  return `FROM ${samplingSource} METADATA _id, _source | WHERE ${messageClause}`;
}

/**
 * Syntax-only validation — predictive queries legitimately return 0 rows, so we
 * do not run them. The ES|QL parser is error-recovering (it does not throw), so
 * we check the returned `errors` list and require a FROM command.
 */
export function isValidEsqlSyntax(query: string): boolean {
  try {
    const { root, errors } = Parser.parse(query);
    if (errors.length > 0) {
      return false;
    }
    return Boolean(Walker.match(root, { type: 'command', name: 'from' }));
  } catch {
    return false;
  }
}

/**
 * Generates draft predictive Query KIs from extracted log signatures. Queries
 * are de-duplicated by normalized ES|QL within the batch; syntactically invalid
 * queries are dropped. The resolved service-name feature is linked so the
 * provenance chain (Stage 1 -> Stage 2) is explicit.
 */
export function generatePredictiveQueries({
  serviceName,
  samplingSource,
  signatures,
  repository,
  fingerprint,
  messageField,
  messageIsText,
}: {
  serviceName: string;
  samplingSource: string;
  signatures: LogSignature[];
  repository: string;
  fingerprint?: string;
  messageField?: string;
  messageIsText?: boolean;
}): StreamQuery[] {
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const seenEsql = new Set<string>();
  const queries: StreamQuery[] = [];

  for (const signature of signatures) {
    const esql = buildPredictiveEsql({
      samplingSource,
      staticPrefix: signature.staticPrefix,
      messageField,
      messageIsText,
    });

    if (!isValidEsqlSyntax(esql)) {
      continue;
    }

    const normalized = normalizeEsqlSafe(esql);
    if (seenEsql.has(normalized)) {
      continue;
    }
    seenEsql.add(normalized);

    const location = signature.location ? `${ref}:${signature.location}` : ref;

    queries.push({
      id: uuidv4(),
      type: QUERY_TYPE_MATCH,
      title: toTitle(signature.staticPrefix),
      description: `Predictive: log.${signature.level} "${signature.staticPrefix}" found in code for service "${serviceName}" (not yet confirmed in logs).`,
      esql: { query: esql },
      severity_score: signature.severity,
      evidence: [`code: ${location} ${signature.level}("${signature.message}")`],
      features: [{ id: CODE_FEATURE_SUBTYPE_SERVICE_NAME }],
    });
  }

  return queries;
}

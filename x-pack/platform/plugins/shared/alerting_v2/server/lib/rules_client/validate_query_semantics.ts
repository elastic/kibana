/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Query } from '@kbn/alerting-v2-schemas';
import {
  getBreachEsqlQuery,
  getRecoverEsqlQuery,
  getNoDataEsqlQuery,
} from '@kbn/alerting-v2-schemas';

/**
 * Per-block semantic validation error.
 *
 * `path` is the dotted JSON-pointer-style location of the offending field in
 * the request body (e.g. `query.recovery.segment`), suitable for surfacing
 * back to API clients so they can highlight the failing block.
 */
export interface SemanticQueryValidationError {
  path: string;
  message: string;
}

/**
 * The three blocks a rule query can declare. Used for both the resolved-query
 * iteration and error-path construction.
 */
type Block = 'breach' | 'recovery' | 'no_data';

/**
 * Single ES|QL string + the path it was sourced from. We resolve the path up
 * front so the validator can report failures keyed to the user's input shape
 * regardless of whether the query is composed or standalone.
 */
interface ResolvedQueryBlock {
  block: Block;
  path: string;
  query: string;
}

const fieldKey = (query: Query, block: Block): 'segment' | 'query' =>
  query.format === 'composed' ? 'segment' : 'query';

/**
 * Returns each effective ES|QL string the executor would run for the given
 * rule query, paired with the JSON path of the field the user actually wrote.
 * Blocks that are absent (e.g. no recovery, or recovery strategy `no_breach`)
 * are skipped so we never validate a query the rule won't run.
 */
const resolveQueryBlocks = (query: Query): ResolvedQueryBlock[] => {
  const blocks: ResolvedQueryBlock[] = [];

  blocks.push({
    block: 'breach',
    path: `query.breach.${fieldKey(query, 'breach')}`,
    query: getBreachEsqlQuery(query),
  });

  const recovery = getRecoverEsqlQuery(query);
  if (recovery !== undefined) {
    blocks.push({
      block: 'recovery',
      path: `query.recovery.${fieldKey(query, 'recovery')}`,
      query: recovery,
    });
  }

  const noData = getNoDataEsqlQuery(query);
  if (noData !== undefined) {
    blocks.push({
      block: 'no_data',
      path: `query.no_data.${fieldKey(query, 'no_data')}`,
      query: noData,
    });
  }

  return blocks;
};

const formatEsError = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return String(err);
};

/**
 * Submit a single ES|QL string to Elasticsearch with `| LIMIT 0` appended so
 * the cluster runs end-to-end validation (parse + column lineage + index
 * resolution) without returning rows. Throws on any error.
 */
const validateSingleEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string,
  abortSignal?: AbortSignal
): Promise<void> => {
  await esClient.esql.query(
    {
      query: `${query} | LIMIT 0`,
      format: 'json',
    },
    { signal: abortSignal }
  );
};

/**
 * Submit each effective ES|QL string in the resolved rule query to ES for
 * semantic validation. Returns all per-block errors so the caller can decide
 * whether to short-circuit or aggregate them; never throws.
 */
export const collectQuerySemanticErrors = async ({
  esClient,
  query,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  query: Query;
  abortSignal?: AbortSignal;
}): Promise<SemanticQueryValidationError[]> => {
  const errors: SemanticQueryValidationError[] = [];

  for (const { path, query: effective } of resolveQueryBlocks(query)) {
    try {
      await validateSingleEsqlQuery(esClient, effective, abortSignal);
    } catch (err) {
      errors.push({ path, message: formatEsError(err) });
    }
  }

  return errors;
};

/**
 * Layer 2 entry point for the route handler / rules client. Submits each
 * effective ES|QL string to Elasticsearch for semantic validation and throws
 * a `Boom.badRequest` (HTTP 400) on the first failure, identifying which
 * block failed in the error message.
 *
 * Layer 1 (Zod) has already enforced shape and basic ES|QL syntax — this
 * layer catches column-lineage, index, and runtime semantic errors that can
 * only be checked end-to-end against the user's actual base query.
 */
export const validateQuerySemantics = async ({
  esClient,
  query,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  query: Query;
  abortSignal?: AbortSignal;
}): Promise<void> => {
  const errors = await collectQuerySemanticErrors({ esClient, query, abortSignal });

  if (errors.length === 0) return;

  const [first, ...rest] = errors;
  const detail = rest.length > 0 ? ` (and ${rest.length} more)` : '';
  throw Boom.badRequest(`Invalid ES|QL in ${first.path}: ${first.message}${detail}`, {
    type: 'EsqlSemanticValidationError',
    errors,
  });
};

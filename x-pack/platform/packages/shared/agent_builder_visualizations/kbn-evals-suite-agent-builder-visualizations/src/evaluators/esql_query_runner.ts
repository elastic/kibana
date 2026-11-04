/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { substituteEsqlBindParams } from './esql_bind_params';

export interface EsqlQueryResult {
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
}

export type EsqlQueryRunner = (query: string) => Promise<EsqlQueryResult>;

const MAX_CACHED_QUERIES = 256;

/**
 * Executes ES|QL with the time bind params substituted. Identical queries share
 * one execution per runner, so the evaluators that each run a candidate query
 * hit Elasticsearch once instead of once apiece. Failed executions are not
 * cached, so a transient error is retried by the next caller.
 */
export function createEsqlQueryRunner(esClient: ElasticsearchClient): EsqlQueryRunner {
  const executions = new Map<string, Promise<EsqlQueryResult>>();

  return (query) => {
    const cached = executions.get(query);
    if (cached) {
      return cached;
    }

    const execution = (
      esClient.esql.query({ query: substituteEsqlBindParams(query) }) as Promise<EsqlQueryResult>
    ).catch((error: unknown) => {
      executions.delete(query);
      throw error;
    });

    if (executions.size >= MAX_CACHED_QUERIES) {
      const oldest = executions.keys().next().value;
      if (oldest !== undefined) {
        executions.delete(oldest);
      }
    }
    executions.set(query, execution);
    return execution;
  };
}

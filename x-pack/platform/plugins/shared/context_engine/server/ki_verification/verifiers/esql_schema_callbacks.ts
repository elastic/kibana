/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { EsqlService } from '@kbn/esql-server-utils';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { withRetry } from './retry';

interface CreateEsqlSchemaCallbacksParams {
  esClient: ElasticsearchClient;
  abortSignal?: AbortSignal;
  retryDelayMs?: number;
}

export interface EsqlSchemaCallbacks {
  callbacks: Pick<ESQLCallbacks, 'getColumnsFor' | 'getPolicies'>;
}

const MAX_METADATA_ATTEMPTS = 3;

/** Creates ES|QL resource callbacks scoped to one KI verification. */
export const createEsqlSchemaCallbacks = ({
  esClient,
  abortSignal,
  retryDelayMs = 200,
}: CreateEsqlSchemaCallbacksParams): EsqlSchemaCallbacks => {
  const esqlService = new EsqlService({ client: esClient });
  const sourceExistenceChecks = new Map<string, Promise<void>>();
  const retryOptions = {
    maxAttempts: MAX_METADATA_ATTEMPTS,
    delayMs: retryDelayMs,
    signal: abortSignal,
  };

  const ensureSourcesExist = async (query: string): Promise<void> => {
    const index = getIndexPatternFromESQLQuery(query);
    if (!index) {
      return;
    }

    const existingCheck = sourceExistenceChecks.get(index);
    if (existingCheck) {
      return existingCheck;
    }

    const check = withRetry(
      () =>
        esClient.fieldCaps(
          {
            index,
            fields: ['_none_'],
            allow_no_indices: false,
            ignore_unavailable: false,
          },
          { signal: abortSignal }
        ),
      retryOptions
    ).then(() => undefined);
    sourceExistenceChecks.set(index, check);
    return check;
  };

  const getColumnsFor: NonNullable<ESQLCallbacks['getColumnsFor']> = async (context) => {
    abortSignal?.throwIfAborted();
    const query = context?.query;
    if (!query) {
      return [];
    }
    await ensureSourcesExist(query);
    return withRetry(() => esqlService.getColumns(query, abortSignal), retryOptions);
  };

  const getPolicies: NonNullable<ESQLCallbacks['getPolicies']> = async () => {
    abortSignal?.throwIfAborted();
    return withRetry(() => esqlService.getPolicies(abortSignal), retryOptions);
  };

  return {
    callbacks: { getColumnsFor, getPolicies },
  };
};

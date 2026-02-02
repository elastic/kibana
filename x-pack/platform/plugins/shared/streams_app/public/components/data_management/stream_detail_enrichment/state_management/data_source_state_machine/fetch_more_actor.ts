/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import { conditionToESQL } from '@kbn/streamlang';
import type { SampleDocument } from '@kbn/streams-schema';
import { filter, timeout, map, catchError, throwError } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { fromPromise } from 'xstate5';
import { executeEsqlQuery } from '../../../../../hooks/use_execute_esql_query';
import type { DataSourceMachineDeps } from './types';

// Constants for fetch more functionality
const FETCH_MORE_SIZE = 100;
const SEARCH_TIMEOUT_MS = 10000;

export interface FetchMoreInput {
  streamName: string;
  condition: Condition;
  existingData: SampleDocument[];
}

/**
 * Creates a unique identifier for a document based on its content.
 * Used for deduplication when appending new samples.
 */
export function getDocumentId(doc: SampleDocument): string {
  return JSON.stringify(doc['@timestamp']) + JSON.stringify(doc);
}

/**
 * Builds an ESQL query to find matching documents:
 * FROM <stream> METADATA _id | WHERE <condition> | KEEP _id | LIMIT <size>
 */
export function buildFetchMoreEsqlQuery(streamName: string, condition: Condition): string {
  const conditionEsql = conditionToESQL(condition);
  return `FROM ${streamName} METADATA _id | WHERE ${conditionEsql} | KEEP _id | LIMIT ${FETCH_MORE_SIZE}`;
}

/**
 * Creates the actor that fetches more matching documents.
 */
export function createFetchMoreDocumentsActor({ data }: Pick<DataSourceMachineDeps, 'data'>) {
  return fromPromise<SampleDocument[], FetchMoreInput>(async ({ input, signal }) => {
    return fetchMoreMatchingDocuments({ data, input, signal });
  });
}

/**
 * Fetches more matching documents by:
 * 1. Running an ESQL query to find matching document IDs
 * 2. Fetching full documents by those IDs from Elasticsearch
 */
async function fetchMoreMatchingDocuments({
  data,
  input,
  signal,
}: {
  data: DataSourceMachineDeps['data'];
  input: FetchMoreInput;
  signal: AbortSignal;
}): Promise<SampleDocument[]> {
  const { streamName, condition, existingData } = input;

  // Step 1: Build and execute ESQL query to get matching document IDs
  const esqlQuery = buildFetchMoreEsqlQuery(streamName, condition);

  const esqlResponse = await executeEsqlQuery({
    query: esqlQuery,
    search: data.search.search.bind(data.search),
    signal,
  });

  // Extract document IDs from the ESQL response
  const idColumnIndex = esqlResponse.columns?.findIndex((col) => col.name === '_id') ?? -1;
  if (idColumnIndex === -1 || !esqlResponse.values) {
    return [];
  }

  const documentIds = esqlResponse.values
    .map((row) => row[idColumnIndex] as string)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (documentIds.length === 0) {
    return [];
  }

  // Filter out IDs that we already have
  const existingDocIds = new Set(existingData.map((doc) => getDocumentId(doc)));

  // Step 2: Fetch full documents by IDs
  const documents = await fetchDocumentsByIds({
    data,
    streamName,
    documentIds,
    signal,
  });

  // Filter duplicates
  return documents.filter((doc) => !existingDocIds.has(getDocumentId(doc)));
}

/**
 * Fetches full documents by their IDs from Elasticsearch.
 */
async function fetchDocumentsByIds({
  data,
  streamName,
  documentIds,
  signal,
}: {
  data: DataSourceMachineDeps['data'];
  streamName: string;
  documentIds: string[];
  signal: AbortSignal;
}): Promise<SampleDocument[]> {
  return new Promise((resolve, reject) => {
    const subscription = data.search
      .search(
        {
          params: {
            index: streamName,
            query: {
              ids: {
                values: documentIds,
              },
            },
            size: documentIds.length,
            _source: true,
          },
        },
        { abortSignal: signal }
      )
      .pipe(
        filter((result) => !isRunningResponse(result)),
        timeout(SEARCH_TIMEOUT_MS),
        map((result) => result.rawResponse.hits.hits.map((hit) => hit._source as SampleDocument)),
        catchError(handleTimeoutError)
      )
      .subscribe({
        next: (documents) => resolve(documents),
        error: (err) => reject(err),
      });

    signal.addEventListener('abort', () => {
      subscription.unsubscribe();
      reject(new Error('Aborted'));
    });
  });
}

/**
 * Handles timeout errors with a user-friendly message.
 */
function handleTimeoutError(error: Error) {
  if (error.name === 'TimeoutError') {
    return throwError(
      () =>
        new Error(
          i18n.translate('xpack.streams.dataSource.fetchMoreTimeoutErrorMessage', {
            defaultMessage:
              'Fetching additional documents timed out after 10 seconds. Please try again.',
          })
        )
    );
  }
  return throwError(() => error);
}

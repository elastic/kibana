/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  stripOtelAliases,
  withUnmappedFieldsDirective,
  type SampleDocument,
} from '@kbn/streams-schema';
import { getFlattenedObject } from '@kbn/std';
import { fromObservable } from 'xstate';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { convertQueryToESQLExpression } from '@kbn/esql-utils';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { Observable } from 'rxjs';
import { esqlResultToPlainObjects } from '../../../../../../util/esql_result_to_plain_objects';
import type {
  EnrichmentDataSourceWithUIAttributes,
  PipelineProcessorsUiDefinition,
} from '../../types';

const FETCH_MORE_LIMIT = 100;

/**
 * Extracts raw documents from `_source` metadata, discarding ES|QL
 * processing-derived columns. The ES|QL query applies processing only
 * to enable condition filtering; the actual document content should
 * come from `_source` so the simulation can show correct diffs.
 */
export function extractRawDocumentsFromSource(docs: SampleDocument[]): SampleDocument[] {
  return docs.map((doc) => {
    const { _source, _id } = doc;
    if (!_source || typeof _source !== 'object') {
      return doc;
    }
    const flatSource = getFlattenedObject(_source as Record<string, unknown>) as SampleDocument;
    if (typeof _id === 'string') {
      flatSource._id = _id;
    }
    return flatSource;
  });
}

export interface FetchMoreInput {
  conditionEsql?: string;
  processingSteps: PipelineProcessorsUiDefinition;
  existingDocuments: SampleDocument[];
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
}

export interface FetchMoreDeps {
  data: DataPublicPluginStart;
}

export function deduplicateDocuments(
  existingDocs: SampleDocument[],
  newDocs: SampleDocument[]
): SampleDocument[] {
  const existingIds = new Set(
    existingDocs.map((doc) => doc._id).filter((id): id is string => typeof id === 'string')
  );

  if (existingIds.size > 0) {
    const uniqueNewDocs = newDocs.filter(
      (doc) => typeof doc._id !== 'string' || !existingIds.has(doc._id)
    );
    return [...existingDocs, ...uniqueNewDocs];
  }

  return [...existingDocs, ...newDocs];
}

export function buildKqlWhereClause(dataSource: EnrichmentDataSourceWithUIAttributes): string {
  if (dataSource.type !== 'kql-samples') return '';

  const clauses: string[] = [];

  const queryExpr = convertQueryToESQLExpression(dataSource.query as Query | undefined);
  if (queryExpr) {
    clauses.push(queryExpr);
  }

  if (dataSource.filters && dataSource.filters.length > 0) {
    const { esqlExpression } = convertFiltersToESQLExpression(dataSource.filters as Filter[]);
    if (esqlExpression) {
      clauses.push(esqlExpression);
    }
  }

  return clauses.join(' AND ');
}

async function buildFetchMoreEsqlQuery({
  streamName,
  conditionEsql,
  dataSource,
}: {
  streamName: string;
  conditionEsql?: string;
  dataSource: EnrichmentDataSourceWithUIAttributes;
}): Promise<string> {
  let baseQuery = `FROM ${streamName} METADATA _id, _source`;

  const kqlWhereClause = buildKqlWhereClause(dataSource);
  if (kqlWhereClause) {
    baseQuery += `\n| WHERE ${kqlWhereClause}`;
  }

  // Condition fetch-more is parked until condition blocks are ported to
  // native ingest-pipeline semantics.

  if (conditionEsql) {
    baseQuery += `\n| WHERE ${conditionEsql}`;
  }
  baseQuery += `\n| SORT @timestamp DESC`;
  baseQuery += `\n| LIMIT ${FETCH_MORE_LIMIT}`;

  return kqlWhereClause ? baseQuery : withUnmappedFieldsDirective(baseQuery);
}

export function createFetchMoreDocumentsActor({ data }: FetchMoreDeps) {
  return fromObservable<SampleDocument[], FetchMoreInput>(({ input }) => {
    const { conditionEsql, existingDocuments, dataSource, streamName } = input;
    const abortController = new AbortController();

    return new Observable((observer) => {
      const execute = async () => {
        const esqlQuery = await buildFetchMoreEsqlQuery({
          streamName,
          conditionEsql,
          dataSource,
        });

        const { response } = await getESQLResults({
          esqlQuery,
          search: data.search.search,
          signal: abortController.signal,
        });

        let docs = esqlResultToPlainObjects<SampleDocument>(response);
        docs = extractRawDocumentsFromSource(docs);

        docs = stripOtelAliases(docs);
        return deduplicateDocuments(existingDocuments, docs);
      };

      execute()
        .then((docs) => {
          observer.next(docs);
          observer.complete();
        })
        .catch((err) => {
          if (!abortController.signal.aborted) {
            observer.error(err);
          }
        });

      return () => {
        abortController.abort();
      };
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConditionBlock, transpileEsql } from '@kbn/streamlang';
import type { Condition, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import {
  stripOtelAliases,
  withUnmappedFieldsDirective,
  type SampleDocument,
} from '@kbn/streams-schema';
import { getFlattenedObject } from '@kbn/std';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { fromObservable } from 'xstate';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { convertQueryToESQLExpression } from '@kbn/esql-utils';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { Observable } from 'rxjs';
import { esqlResultToPlainObjects } from '../../../../../../util/esql_result_to_plain_objects';
import { resolveDraftSampleSource } from './data_collector_actor';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';

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
  conditionEsql: string;
  processingSteps: StreamlangDSL;
  existingDocuments: SampleDocument[];
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
  isDraft?: boolean;
}

export interface FetchMoreDeps {
  data: DataPublicPluginStart;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export function findConditionById(
  steps: StreamlangStepWithUIAttributes[],
  conditionId: string
): Condition | undefined {
  const step = steps.find((s) => isConditionBlock(s) && s.customIdentifier === conditionId);
  if (step && isConditionBlock(step)) {
    return step.condition as Condition;
  }
  return undefined;
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

interface FetchMoreQueryResult {
  esqlQuery: string;
  parentIsDraft: boolean;
  /** Processing steps from all draft ancestors, ordered root to closest parent. */
  ancestorProcessing: StreamlangDSL;
}

async function buildFetchMoreEsqlQuery({
  streamName,
  conditionEsql,
  processingSteps,
  isDraft,
  dataSource,
  streamsRepositoryClient,
}: {
  streamName: string;
  conditionEsql: string;
  processingSteps: StreamlangDSL;
  isDraft: boolean;
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamsRepositoryClient: StreamsRepositoryClient;
}): Promise<FetchMoreQueryResult> {
  let baseQuery: string;
  let parentIsDraft = false;
  let ancestorProcessing: StreamlangDSL = { steps: [] };

  if (isDraft) {
    const draftSource = await resolveDraftSampleSource(streamsRepositoryClient, streamName);
    baseQuery = draftSource.baseQuery;
    parentIsDraft = draftSource.parentIsDraft;
    ancestorProcessing = draftSource.ancestorProcessing;
  } else {
    baseQuery = `FROM ${streamName} METADATA _id, _source`;
  }

  const kqlWhereClause = buildKqlWhereClause(dataSource);
  if (kqlWhereClause) {
    baseQuery += `\n| WHERE ${kqlWhereClause}`;
  }

  if (processingSteps.steps.length > 0) {
    const result = await transpileEsql(processingSteps);
    if (result.commands.length > 0) {
      baseQuery += `\n| ${result.commands.join('\n| ')}`;
    }
  }

  baseQuery += `\n| WHERE ${conditionEsql}`;
  baseQuery += `\n| SORT @timestamp DESC`;
  baseQuery += `\n| LIMIT ${FETCH_MORE_LIMIT}`;

  const esqlQuery = kqlWhereClause ? baseQuery : withUnmappedFieldsDirective(baseQuery);

  return { esqlQuery, parentIsDraft, ancestorProcessing };
}

export function createFetchMoreDocumentsActor({ data, streamsRepositoryClient }: FetchMoreDeps) {
  return fromObservable<SampleDocument[], FetchMoreInput>(({ input }) => {
    const { conditionEsql, processingSteps, existingDocuments, dataSource, streamName, isDraft } =
      input;
    const abortController = new AbortController();

    return new Observable((observer) => {
      const execute = async () => {
        const { esqlQuery, parentIsDraft, ancestorProcessing } = await buildFetchMoreEsqlQuery({
          streamName,
          conditionEsql,
          processingSteps,
          isDraft: isDraft ?? false,
          dataSource,
          streamsRepositoryClient,
        });

        const { response } = await getESQLResults({
          esqlQuery,
          search: data.search.search,
          signal: abortController.signal,
        });

        let docs = esqlResultToPlainObjects<SampleDocument>(response);
        docs = extractRawDocumentsFromSource(docs);

        if (parentIsDraft && ancestorProcessing.steps.length > 0) {
          docs = await applyAncestorProcessing({
            docs,
            ancestorProcessing,
            streamName,
            streamsRepositoryClient,
            signal: abortController.signal,
          });
        }

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

/**
 * When the parent is a draft stream, `_source` contains only the raw
 * stored document without ancestor draft processing. Uses the simulate
 * endpoint to apply all draft ancestor processing steps to the raw docs,
 * producing the correct pre-processing baseline for the child's
 * simulation diff.
 */
async function applyAncestorProcessing({
  docs,
  ancestorProcessing,
  streamName,
  streamsRepositoryClient,
  signal,
}: {
  docs: SampleDocument[];
  ancestorProcessing: StreamlangDSL;
  streamName: string;
  streamsRepositoryClient: StreamsRepositoryClient;
  signal: AbortSignal;
}): Promise<SampleDocument[]> {
  const result = await streamsRepositoryClient.fetch(
    'POST /internal/streams/{name}/processing/_simulate',
    {
      signal,
      params: {
        path: { name: streamName },
        body: {
          processing: ancestorProcessing,
          documents: docs,
        },
      },
    }
  );

  return result.documents.map((docReport) => docReport.value as SampleDocument);
}

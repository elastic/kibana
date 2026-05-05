/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Condition } from '@kbn/streamlang';
import { conditionToQueryDsl, isConditionBlock } from '@kbn/streamlang';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { SampleDocument } from '@kbn/streams-schema';
import { fromObservable } from 'xstate';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { IEsSearchResponse } from '@kbn/search-types';
import { Observable, filter, map } from 'rxjs';

const FETCH_MORE_LIMIT = 100;

export interface FetchMoreInput {
  streamName: string;
  condition: Condition;
  runtimeMappings: MappingRuntimeFields;
  existingDocuments: SampleDocument[];
}

export interface FetchMoreDeps {
  data: DataPublicPluginStart;
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

export function buildFetchMoreSearchParams(
  streamName: string,
  condition: Condition,
  runtimeMappings: MappingRuntimeFields
) {
  const conditionClause = conditionToQueryDsl(condition);

  return {
    index: streamName,
    query: {
      bool: {
        must: [conditionClause],
      },
    },
    runtime_mappings: runtimeMappings,
    size: FETCH_MORE_LIMIT,
    sort: [{ '@timestamp': { order: 'desc' as const } }],
    terminate_after: FETCH_MORE_LIMIT,
    track_total_hits: false,
    allow_partial_search_results: true,
  };
}

function isValidSearchResult(result: IEsSearchResponse): boolean {
  return !isRunningResponse(result) && result.rawResponse.hits?.hits !== undefined;
}

function extractDocumentsFromResult(result: IEsSearchResponse): SampleDocument[] {
  return result.rawResponse.hits.hits.map((hit) => hit._source);
}

export function deduplicateDocuments(
  existingDocs: SampleDocument[],
  newDocs: SampleDocument[]
): SampleDocument[] {
  const existingSet = new Set(existingDocs.map((doc) => JSON.stringify(doc)));
  const uniqueNewDocs = newDocs.filter((doc) => !existingSet.has(JSON.stringify(doc)));
  return [...existingDocs, ...uniqueNewDocs];
}

export function createFetchMoreDocumentsActor({ data }: FetchMoreDeps) {
  return fromObservable<SampleDocument[], FetchMoreInput>(({ input }) => {
    const { streamName, condition, runtimeMappings, existingDocuments } = input;
    const abortController = new AbortController();
    const params = buildFetchMoreSearchParams(streamName, condition, runtimeMappings);

    return new Observable((observer) => {
      const subscription = data.search
        .search({ params }, { abortSignal: abortController.signal })
        .pipe(
          filter(isValidSearchResult),
          map(extractDocumentsFromResult),
          map((newDocs) => deduplicateDocuments(existingDocuments, newDocs))
        )
        .subscribe(observer);

      return () => {
        abortController.abort();
        subscription.unsubscribe();
      };
    });
  });
}

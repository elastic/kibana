/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConditionBlock } from '@kbn/streamlang';
import type { Condition, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import {
  mergeSourceIntoDocuments,
  stripOtelAliases,
  type SampleDocument,
} from '@kbn/streams-schema';
import { fromObservable } from 'xstate';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import { Observable } from 'rxjs';
import { esqlResultToPlainObjects } from '../../../../../../util/esql_result_to_plain_objects';

export interface FetchMoreInput {
  esqlQuery: string;
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
    const { esqlQuery, existingDocuments } = input;
    const abortController = new AbortController();

    return new Observable((observer) => {
      getESQLResults({
        esqlQuery,
        search: data.search.search,
        signal: abortController.signal,
      })
        .then(({ response }) => {
          let docs = esqlResultToPlainObjects<SampleDocument>(response);
          docs = mergeSourceIntoDocuments(docs);
          docs = stripOtelAliases(docs);
          observer.next(deduplicateDocuments(existingDocuments, docs));
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

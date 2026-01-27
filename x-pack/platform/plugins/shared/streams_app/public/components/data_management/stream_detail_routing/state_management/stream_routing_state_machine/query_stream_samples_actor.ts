/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, map, switchMap, catchError, of, debounceTime, startWith } from 'rxjs';
import type { SampleDocument } from '@kbn/streams-schema';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { fromEventObservable } from 'xstate5';
import type { TimefilterHook } from '@kbn/data-plugin/public/query/timefilter/use_timefilter';
import { i18n } from '@kbn/i18n';
import { executeEsqlQuery } from '../../../../../hooks/use_execute_esql_query';
import { esqlResultToPlainObjects } from '../../../../../util/esql_result_to_plain_objects';

export interface QueryStreamSamplesMachineDeps {
  data: DataPublicPluginStart;
  timeState$: TimefilterHook['timeState$'];
}

export interface QueryStreamSamplesInput {
  esqlQuery: string;
}

export type QueryStreamSamplesEvent =
  | { type: 'queryStream.samplesReceived'; documents: SampleDocument[] }
  | { type: 'queryStream.samplesError'; error: Error }
  | { type: 'queryStream.samplesLoading' };

const QUERY_DEBOUNCE_MS = 500;

/**
 * Creates an actor that executes ES|QL queries and emits events back to the parent machine.
 * It subscribes to time filter updates and re-executes the query when time changes.
 */
export function createQueryStreamSamplesActor({
  data,
  timeState$,
}: QueryStreamSamplesMachineDeps) {
  return fromEventObservable<QueryStreamSamplesEvent, QueryStreamSamplesInput>(({ input }) => {
    return collectQueryStreamDocuments({ data, timeState$, esqlQuery: input.esqlQuery });
  });
}

function collectQueryStreamDocuments({
  data,
  timeState$,
  esqlQuery,
}: QueryStreamSamplesMachineDeps & { esqlQuery: string }): Observable<QueryStreamSamplesEvent> {
  if (!esqlQuery || esqlQuery.trim() === '') {
    return of({ type: 'queryStream.samplesReceived', documents: [] });
  }

  // Subscribe to time state changes and execute query
  return timeState$.pipe(
    debounceTime(QUERY_DEBOUNCE_MS),
    startWith({ type: 'queryStream.samplesLoading' } as QueryStreamSamplesEvent),
    switchMap((timeState) => {
      // If this is the loading event, just pass it through
      if (typeof timeState === 'object' && 'type' in timeState) {
        return of(timeState);
      }

      const { start, end } = getAbsoluteTimestamps(data, timeState);

      return new Observable<QueryStreamSamplesEvent>((observer) => {
        const abortController = new AbortController();

        // Emit loading event
        observer.next({ type: 'queryStream.samplesLoading' });

        executeEsqlQuery({
          query: esqlQuery,
          search: data.search.search,
          signal: abortController.signal,
          start,
          end,
          dropNullColumns: true,
        })
          .then((results) => {
            const documents = esqlResultToPlainObjects(results) as SampleDocument[];
            observer.next({ type: 'queryStream.samplesReceived', documents });
            observer.complete();
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              observer.complete();
              return;
            }
            const formattedError = new Error(
              i18n.translate('xpack.streams.queryStreamSamples.queryError', {
                defaultMessage: 'Failed to execute ES|QL query: {message}',
                values: { message: error.message },
              })
            );
            observer.next({ type: 'queryStream.samplesError', error: formattedError });
            observer.complete();
          });

        return () => {
          abortController.abort();
        };
      });
    }),
    catchError((error) => {
      return of({ type: 'queryStream.samplesError', error } as QueryStreamSamplesEvent);
    })
  );
}

function getAbsoluteTimestamps(
  data: DataPublicPluginStart,
  timeState: { start: string; end: string }
) {
  const time = data.query.timefilter.timefilter.calculateBounds({
    from: timeState.start,
    to: timeState.end,
  });

  return {
    start: time.min?.valueOf() ?? Date.now() - 15 * 60 * 1000,
    end: time.max?.valueOf() ?? Date.now(),
  };
}


/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import { setup, assign, fromObservable, fromEventObservable } from 'xstate';
import { Observable, filter, map, switchMap, timeout, catchError, throwError, of, tap } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { SampleDocument, Streams } from '@kbn/streams-schema';
import { isEmpty, isNumber } from 'lodash';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { TimefilterHook } from '@kbn/data-plugin/public/query/timefilter/use_timefilter';
import { i18n } from '@kbn/i18n';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Condition } from '@kbn/streamlang';
import { conditionToQueryDsl, getConditionFields } from '@kbn/streamlang';
import { processCondition } from '../../utils';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';

export interface RoutingSamplesMachineDeps {
  data: DataPublicPluginStart;
  timeState$: TimefilterHook['timeState$'];
  telemetryClient: StreamsTelemetryClient;
}

export type RoutingSamplesActorRef = ActorRefFrom<typeof routingSamplesMachine>;
export type RoutingSamplesActorSnapshot = SnapshotFrom<typeof routingSamplesMachine>;

export type DocumentMatchFilterOptions = 'matched' | 'unmatched';

export interface RoutingSamplesInput {
  condition?: Condition;
  definition: Streams.WiredStream.GetResponse;
  documentMatchFilter: DocumentMatchFilterOptions;
}

export interface RoutingSamplesContext {
  condition?: Condition;
  definition: Streams.WiredStream.GetResponse;
  documents: SampleDocument[];
  documentsError?: Error;
  approximateMatchingPercentage?: number | null;
  approximateMatchingPercentageError?: Error;
  documentMatchFilter: DocumentMatchFilterOptions;
  selectedPreview?:
    | { type: 'suggestion'; name: string; index: number }
    | { type: 'createStream' }
    | { type: 'updateStream'; name: string };
}

export type RoutingSamplesEvent =
  | { type: 'routingSamples.refresh' }
  | { type: 'routingSamples.updateCondition'; condition?: Condition }
  | { type: 'routingSamples.setDocumentMatchFilter'; filter: DocumentMatchFilterOptions }
  | {
      type: 'routingSamples.setSelectedPreview';
      preview: RoutingSamplesContext['selectedPreview'];
      condition: Condition;
    }
  | {
      type: 'routingSamples.updatePreviewName';
      name: string;
    };

export interface SearchParams extends RoutingSamplesInput {
  start: number;
  end: number;
}

export interface CollectorParams {
  data: DataPublicPluginStart;
  input: RoutingSamplesInput;
  telemetryClient?: StreamsTelemetryClient;
}

const SAMPLES_SIZE = 100;
const PROBABILITY_THRESHOLD = 100000;
const SEARCH_TIMEOUT_MS = 10000; // 10 seconds

export const routingSamplesMachine = setup({
  types: {
    input: {} as RoutingSamplesInput,
    context: {} as RoutingSamplesContext,
    events: {} as RoutingSamplesEvent,
  },
  actors: {
    collectDocuments: getPlaceholderFor(createDocumentsCollectorActor),
    collectDocumentsCount: getPlaceholderFor(createDocumentsCountCollectorActor),
    subscribeTimeUpdates: getPlaceholderFor(createTimeUpdatesActor),
  },
  actions: {
    updateCondition: assign((_, params: { condition?: Condition }) => ({
      condition: params.condition,
    })),
    storeDocuments: assign((_, params: { documents: SampleDocument[] }) => ({
      documents: params.documents,
    })),
    storeDocumentsError: assign((_, params: { error: Error | undefined }) => ({
      documentsError: params.error,
    })),
    storeDocumentCounts: assign((_, params: { count?: number | null }) => ({
      approximateMatchingPercentage: params.count,
      approximateMatchingPercentageError: undefined,
    })),
    storeDocumentCountsError: assign((_, params: { error: Error }) => ({
      approximateMatchingPercentageError: params.error,
    })),
    setDocumentMatchFilter: assign((_, params: { filter: DocumentMatchFilterOptions }) => ({
      documentMatchFilter: params.filter,
    })),
    setSelectedPreview: assign(
      (_, params: { preview: RoutingSamplesContext['selectedPreview'] }) => ({
        selectedPreview: params.preview,
      })
    ),
    updatePreviewName: assign(({ context }, params: { name: string }) => {
      if (!context.selectedPreview || context.selectedPreview.type !== 'suggestion') {
        return {};
      }
      return {
        selectedPreview: {
          ...context.selectedPreview,
          name: params.name,
        },
      };
    }),
  },
  delays: {
    conditionUpdateDebounceTime: 500,
  },
  guards: {
    isValidSnapshot: (_, params: { context?: SampleDocument[] | number | null }) =>
      params.context !== undefined,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGUBDAWwAcAbOAYjSz0NMrgDpkwAzd2ACwG0ADAF1EoMqljYcqXKJAAPRADYAjCwDsAJiUCBSgJwqAHAGYVAViXqlAGhABPRABZLLc9aUmr6rSpMBffzs6HHxicipYWgxQxgjWdDIIIkwwAGEZCClsGUERJBBxSWlZAsUEL3MWIxUVJ2N9ARV9cxVbB2cTExYdXU16vyNzIydA4JiGcOZYFggwACMMXABjBgzcLJLqeVhMFLAWIg5U5AAKZczsmQBVJP2AEQWl5bAAFWwSMABKaPowpkisye6BWa0uJTyciKV1KoHKJnUVTq6hMTicAjM6IEljsjgQnm6mi0NRM+nq5j0+jGIBCkwBrA4YEwyx4DFmqGW6E+uEwMwoqCIWXw1AgMgOeAAbqgANYHC4UKjLTD3DlcsA82CQgrQkpycrmExGFhOKxGAyIymafS4xD6O0sO0Y7HqCwYlTU2n-eIzRnM1n4dmc7m8lj8wUMahgZBoZAsSgpDioZAkFjyxXK1XBzXCKESGF6xAG-QsPzuQxE-RKE02hBGdRG8zmJx2pxGTReTzqD0TL3TFi+lls0VB9WYDIgkNhoVQEViliSmVy1AKsBKlUjjXjnlasR53VlQtoh3qASNJ31EbWjoIPwqdRuUwmPpafp+bt-OJ9gf+qCBtU8rdJwFadI2jJM4woBMkxTNNVwzDdeUAndCj3HJYQUQ8qk8Iw22MLo-HUK88RUTQBE0Y1zErAR1CcDxdHMQIghAXBUDmeACk9T9IlzYo0ILBAsMNUxhhwusTRUGtNCMAQS10AR0TvTRtBcd9YimQE5kWEFVnwdZNj47VUJkfj0WLZsVGomjaKaPQa0sGS2jLEZsUbRtVLpb1+yZQd8B4-MDwE7psOE0SxNUGsT26RtzOaC9K00dze0Bb8h0zUd2N3XjjICizyJRFp9FMQihn0JSIsMFhsWbA1DSJQiqSYzj1IZbyfz-LNQ2Ahg-P3OFEFdDRSUoorCsosrryMfR70aVtRpafCGMansuJav1UoQmZRVwMAeoMvrayaB1SMRA1NAsk0TBrSajXrCxrFPWp9BMBKlo-ZqfVa9b-zHJZeV27L9ostRgpMEScJo8Lr1qDFjS8JSDWk9xnsSlaPrWgNh2+wC+S63zDKy9DyjqYsQbBsKa0emSntUIlaZcFoUferz0d-THg2x9ltv+wnEGk7oyIsO8alIswJKhs7yOpto2wNJGXsCIA */
  id: 'routingSamples',
  context: ({ input }) => ({
    condition: input.condition,
    definition: input.definition,
    approximateMatchingPercentage: undefined,
    documents: [],
    documentsError: undefined,
    approximateMatchingPercentageError: undefined,
    selectedPreview: undefined,
    documentMatchFilter: 'matched',
  }),
  initial: 'fetching',
  invoke: {
    id: 'subscribeTimeUpdatesActor',
    src: 'subscribeTimeUpdates',
  },
  on: {
    'routingSamples.refresh': {
      target: '.fetching',
      reenter: true,
    },
    'routingSamples.updateCondition': {
      target: '.debouncingCondition',
      reenter: true,
      actions: [{ type: 'updateCondition', params: ({ event }) => event }],
    },
    'routingSamples.setDocumentMatchFilter': {
      target: '.fetching',
      reenter: true,
      actions: [
        {
          type: 'setDocumentMatchFilter',
          params: ({ event }) => event,
        },
      ],
    },
    'routingSamples.setSelectedPreview': {
      target: '.fetching',
      reenter: true,
      actions: [
        {
          type: 'setSelectedPreview',
          params: ({ event }) => event,
        },
        {
          type: 'updateCondition',
          params: ({ event }) => event,
        },
      ],
    },
    'routingSamples.updatePreviewName': {
      actions: [
        {
          type: 'updatePreviewName',
          params: ({ event }) => event,
        },
      ],
    },
  },
  states: {
    debouncingCondition: {
      after: {
        conditionUpdateDebounceTime: 'fetching',
      },
    },
    fetching: {
      type: 'parallel',
      states: {
        documents: {
          initial: 'loading',
          states: {
            loading: {
              entry: [{ type: 'storeDocumentsError', params: { error: undefined } }],
              invoke: {
                id: 'collectDocuments',
                src: 'collectDocuments',
                input: ({ context }) => ({
                  condition: context.condition,
                  definition: context.definition,
                  documentMatchFilter: context.documentMatchFilter,
                }),
                onSnapshot: {
                  guard: {
                    type: 'isValidSnapshot',
                    params: ({ event }) => ({ context: event.snapshot.context }),
                  },
                  actions: [
                    {
                      type: 'storeDocuments',
                      params: ({ event }) => ({ documents: event.snapshot.context ?? [] }),
                    },
                  ],
                },
                onDone: {
                  target: 'done',
                },
                onError: {
                  target: 'done',
                  actions: [
                    {
                      type: 'storeDocuments',
                      params: { documents: [] as SampleDocument[] },
                    },
                    {
                      type: 'storeDocumentsError',
                      params: ({ event }) => ({ error: event.error as Error }),
                    },
                  ],
                },
              },
            },
            done: {
              type: 'final',
            },
          },
        },
        documentCounts: {
          initial: 'loading',
          states: {
            loading: {
              invoke: {
                id: 'collectDocumentsCount',
                src: 'collectDocumentsCount',
                input: ({ context }) => ({
                  condition: context.condition,
                  definition: context.definition,
                  documentMatchFilter: context.documentMatchFilter,
                }),
                onSnapshot: {
                  guard: {
                    type: 'isValidSnapshot',
                    params: ({ event }) => ({ context: event.snapshot.context }),
                  },
                  actions: [
                    {
                      type: 'storeDocumentCounts',
                      params: ({ event }) => ({ count: event.snapshot.context }),
                    },
                  ],
                },
                onDone: {
                  target: 'done',
                },
                onError: {
                  target: 'done',
                  actions: [
                    {
                      type: 'storeDocumentCountsError',
                      params: ({ event }) => ({ error: event.error as Error }),
                    },
                  ],
                },
              },
            },
            done: {
              type: 'final',
            },
          },
        },
      },
    },
  },
});

export const createRoutingSamplesMachineImplementations = ({
  data,
  timeState$,
  telemetryClient,
}: RoutingSamplesMachineDeps): MachineImplementationsFrom<typeof routingSamplesMachine> => ({
  actors: {
    collectDocuments: createDocumentsCollectorActor({ data, telemetryClient }),
    collectDocumentsCount: createDocumentsCountCollectorActor({ data }),
    subscribeTimeUpdates: createTimeUpdatesActor({ timeState$ }),
  },
});

export function createDocumentsCollectorActor({
  data,
  telemetryClient,
}: Pick<RoutingSamplesMachineDeps, 'data' | 'telemetryClient'>) {
  return fromObservable<
    SampleDocument[],
    Pick<SearchParams, 'condition' | 'definition' | 'documentMatchFilter'>
  >(({ input }) => {
    return collectDocuments({ data, input, telemetryClient });
  });
}

export function createDocumentsCountCollectorActor({
  data,
}: Pick<RoutingSamplesMachineDeps, 'data'>) {
  return fromObservable<
    number | null | undefined,
    Pick<SearchParams, 'condition' | 'definition' | 'documentMatchFilter'>
  >(({ input }) => {
    return collectDocumentCounts({ data, input });
  });
}

function createTimeUpdatesActor({ timeState$ }: Pick<RoutingSamplesMachineDeps, 'timeState$'>) {
  return fromEventObservable(() =>
    timeState$.pipe(map(() => ({ type: 'routingSamples.refresh' })))
  );
}

function collectDocuments({
  data,
  input,
  telemetryClient,
}: CollectorParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();

  const { start, end } = getAbsoluteTimestamps(data);
  const params = buildDocumentsSearchParams({ ...input, start, end });

  return new Observable((observer) => {
    let registerFetchLatency: () => void = () => {};

    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal, retrieveResults: true })
      .pipe(
        tap({
          subscribe: () => {
            if (telemetryClient) {
              registerFetchLatency = telemetryClient.startTrackingPartitioningSamplesFetchLatency({
                stream_name: input.definition.stream.name,
                stream_type: 'wired',
              });
            }
          },
          finalize: () => {
            registerFetchLatency();
          },
        }),
        filter((result) => !isRunningResponse(result) || !isEmpty(result.rawResponse.hits.hits)),
        timeout(SEARCH_TIMEOUT_MS),
        map((result) => result.rawResponse.hits.hits.map((hit) => hit._source)),
        catchError(handleTimeoutError)
      )
      .subscribe(observer);

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

function collectDocumentCounts({
  data,
  input,
}: CollectorParams): Observable<number | null | undefined> {
  const abortController = new AbortController();

  const { start, end } = getAbsoluteTimestamps(data);
  const searchParams = { ...input, start, end };
  const params = buildDocumentCountSearchParams(searchParams);

  return new Observable((observer) => {
    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal })
      .pipe(
        filter((result) => !isRunningResponse(result)),
        timeout(SEARCH_TIMEOUT_MS),
        switchMap((countResult) => {
          const docCount =
            !countResult.rawResponse.hits.total || isNumber(countResult.rawResponse.hits.total)
              ? countResult.rawResponse.hits.total
              : countResult.rawResponse.hits.total.value;

          if (!docCount) {
            return of(null);
          }

          return data.search
            .search(
              {
                params: buildDocumentCountProbabilitySearchParams({
                  ...searchParams,
                  docCount,
                }),
              },
              { abortSignal: abortController.signal }
            )
            .pipe(
              filter((result) => !isRunningResponse(result)),
              timeout(SEARCH_TIMEOUT_MS),
              map((result) => {
                // Aggregations don't return partial results so we just wait until the end
                if (result.rawResponse.aggregations) {
                  // We need to divide this by the sampling / probability factor:
                  // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-random-sampler-aggregation.html#random-sampler-special-cases
                  const sampleAgg = result.rawResponse.aggregations.sample as {
                    doc_count: number;
                    probability: number;
                    matching_docs: { doc_count: number };
                  };

                  const randomSampleDocCount = sampleAgg.doc_count / sampleAgg.probability;
                  const matchingDocCount = sampleAgg.matching_docs.doc_count;
                  const percentage =
                    randomSampleDocCount === 0 ? 0 : matchingDocCount / randomSampleDocCount;
                  return percentage;
                }
                return undefined;
              }),
              catchError(handleTimeoutError)
            );
        }),
        catchError(handleTimeoutError)
      )
      .subscribe(observer);

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

const createTimestampRangeQuery = (start: number, end: number) => ({
  range: {
    '@timestamp': {
      gte: start,
      lte: end,
      format: 'epoch_millis',
    },
  },
});

const getAbsoluteTimestamps = (data: DataPublicPluginStart) => {
  const time = data.query.timefilter.timefilter.getAbsoluteTime();

  return {
    start: new Date(time.from).getTime(),
    end: new Date(time.to).getTime(),
  };
};

/**
 * Create runtime mappings for fields that aren't mapped.
 * Conditions could be using fields which are not indexed or they could use it with other types than they are eventually mapped as.
 * Because of this we can't rely on mapped fields to draw a sample, instead we need to use runtime fields to simulate what happens during
 * ingest in the painless condition checks.
 */
function getRuntimeMappings(
  definition: Streams.WiredStream.GetResponse,
  condition?: Condition
): MappingRuntimeFields {
  if (!condition) return {};

  const mappedFields = Object.keys({
    ...definition.inherited_fields,
    ...definition.stream.ingest.wired.fields,
  });

  return Object.fromEntries(
    getConditionFields(condition)
      .filter((field) => !mappedFields.includes(field.name))
      .map((field) => [
        field.name,
        {
          type:
            field.type === 'boolean' ? 'boolean' : field.type === 'number' ? 'double' : 'keyword',
        },
      ])
  );
}

function handleTimeoutError(error: Error) {
  if (error.name === 'TimeoutError') {
    return throwError(
      () =>
        new Error(
          i18n.translate('xpack.streams.routingSamples.documentsSearchTimeoutErrorMessage', {
            defaultMessage:
              'Documents search timed out after 10 seconds. Refresh the preview or try simplifying the routing condition.',
          })
        )
    );
  }
  return throwError(() => error);
}

function buildDocumentsSearchParams({
  condition,
  documentMatchFilter,
  start,
  end,
  definition,
}: SearchParams) {
  const finalCondition = processCondition(condition);
  const runtimeMappings = getRuntimeMappings(definition, finalCondition);

  const isMatched = documentMatchFilter === 'matched';
  const conditionClause = finalCondition ? conditionToQueryDsl(finalCondition) : { match_all: {} };

  const query = {
    bool: {
      filter: [createTimestampRangeQuery(start, end)],
      ...(isMatched ? { must: [conditionClause] } : { must_not: [conditionClause] }),
    },
  };

  return {
    index: definition.stream.name,
    query,
    runtime_mappings: runtimeMappings,
    size: SAMPLES_SIZE,
    sort: [{ '@timestamp': { order: 'desc' } }],
    terminate_after: SAMPLES_SIZE,
    track_total_hits: false,
    allow_partial_search_results: true,
  };
}

export function buildDocumentCountSearchParams({
  start,
  end,
  definition,
}: Pick<SearchParams, 'start' | 'end' | 'definition'>) {
  return {
    index: definition.stream.name,
    query: createTimestampRangeQuery(start, end),
    size: 0,
    track_total_hits: true,
  };
}

export function buildDocumentCountProbabilitySearchParams({
  condition,
  definition,
  docCount,
  end,
  start,
}: Pick<SearchParams, 'condition' | 'start' | 'end' | 'definition'> & { docCount?: number }) {
  const finalCondition = processCondition(condition);
  const runtimeMappings = getRuntimeMappings(definition, finalCondition);
  const query = finalCondition ? conditionToQueryDsl(finalCondition) : { match_all: {} };
  const probability = calculateProbability(docCount);

  return {
    index: definition.stream.name,
    query: createTimestampRangeQuery(start, end),
    aggs: {
      sample: {
        random_sampler: {
          probability,
        },
        aggs: {
          matching_docs: {
            filter: query,
          },
        },
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
    _source: false,
    track_total_hits: false,
  };
}

/**
 * Calculates sampling probability based on document count
 */
function calculateProbability(docCount?: number): number {
  if (!docCount || docCount <= PROBABILITY_THRESHOLD) {
    return 1;
  }
  const probability = PROBABILITY_THRESHOLD / docCount;
  // Values between 0.5 and 1 are not supported by the random sampler
  return probability <= 0.5 ? probability : 1;
}

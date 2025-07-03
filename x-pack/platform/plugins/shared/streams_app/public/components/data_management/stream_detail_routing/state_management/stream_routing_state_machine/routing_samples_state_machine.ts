/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  setup,
  assign,
  ActorRefFrom,
  fromObservable,
  fromEventObservable,
  MachineImplementationsFrom,
  SnapshotFrom,
} from 'xstate5';
import { Observable, filter, map, switchMap, timeout, catchError, throwError } from 'rxjs';
import { MappingRuntimeField, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { IEsSearchResponse } from '@kbn/search-types';
import {
  Condition,
  SampleDocument,
  Streams,
  conditionToQueryDsl,
  getConditionFields,
  isAlwaysCondition,
} from '@kbn/streams-schema';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { TimefilterHook } from '@kbn/data-plugin/public/query/timefilter/use_timefilter';
import { i18n } from '@kbn/i18n';
import { emptyEqualsToAlways } from '../../../../../util/condition';

// Types
export interface RoutingSamplesInput {
  condition?: Condition;
  definition: Streams.WiredStream.GetResponse;
}

export interface RoutingSamplesContext {
  condition?: Condition;
  definition: Streams.WiredStream.GetResponse;
  documents: SampleDocument[];
  documentsError?: Error;
  approximateMatchingPercentage?: string;
  approximateMatchingPercentageError?: Error;
}

export type RoutingSamplesEvent =
  | { type: 'routingSamples.refresh' }
  | { type: 'routingSamples.retry' }
  | { type: 'routingSamples.updateCondition'; condition?: Condition };

export type RoutingSamplesActorRef = ActorRefFrom<typeof routingSamplesMachine>;
export type RoutingSamplesActorSnapshot = SnapshotFrom<typeof routingSamplesMachine>;

// Shared interfaces
interface SearchParams {
  condition?: Condition;
  start: number;
  end: number;
  definition: Streams.WiredStream.GetResponse;
}

interface CollectorParams {
  data: DataPublicPluginStart;
  searchParams: Pick<SearchParams, 'condition' | 'definition'>;
}

// Helper functions
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
    storeDocuments: assign((_, params: { documents: SampleDocument[] }) => {
      return {
        documents: params.documents,
        documentsError: undefined,
      };
    }),
    storeDocumentsError: assign((_, params: { error: Error }) => ({
      documentsError: params.error,
    })),
    storeDocumentCounts: assign((_, params: { count: string }) => ({
      approximateMatchingPercentage: params.count,
      approximateMatchingPercentageError: undefined,
    })),
    storeDocumentCountsError: assign((_, params: { error: Error }) => ({
      approximateMatchingPercentageError: params.error,
    })),
  },
  delays: {
    conditionUpdateDebounceTime: 500,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGUBDAWwAcAbOAYjSz0NMrgDpkwAzd2ACwG0ADAF1EoMqljYcqXKJAAPRAGYAHCpYBGAGwAWNQFYl+gJwB2U1oBMAGhABPRPsvrTK-To0rVAlZdUBff1s6HHxicipYWgxQxgjWdDIIIkwwAHkyaVxYQREkEHFJLLlFBFVjFi1jYwFjJS0VHQEteq1bBwRLLVMWYxVTY08dGt9GrUDgmIZw5lgWDjBMAGMeBhYIVCX0EjBcTDmKVCIIBmoN3DAWPAA3VABrS6XUCiolzAARTe3d-dy5Qqk2BkJUQGg0lgELHqSghWg0wwESmM7UQEPUjR0+hMzVM+nMSgmIBC0yYkXmixWaw2Wx2ewORxO+GoYGQaGQLEoKQ4qGQJBYTxeYDenxpPxywn+EkBwPypTBEKhLVh8JqSJRZScLAG5g0Sg0WP0Aks+sJxLCpNYC2Wq3w6y+tP2LBZbOi9HN8Tm7EwyDsf3yAOKstB4J0LER+nBlj0pma+ja9lRcahOkxuOGDQE7lNU3ds3J1qp9p+AGEMHSWIdjqdzpcbvdHs9Xh8i3TS+g9n6xFLA6A5frISnBpZqhYNAJweqseoBDOVFpaoaVBoLNm3XE81bKbbqd89m3y5XGVBmayeRyKFyeXyBU2Rbv9vvMJ2Ct2gbIgwgwYaWIPwSO4eONgJggWhJjOtS6OYKaGqYq6xDMZKbjaUB2qKe5lo6zo8q68EWp6iw+s+AZviCn4aIMLDGjocLDpiNROOq876Cwho+PiKgzqmgRBCAuCoBAcByGa66RJKRQkR+ShNJougGEYZgWEBHQALRYr0mYwlY1FGDGOhwSSHr5luUBidK769oguhKD+wyePCsJzko6p6ixxjUU0ljDq4qhxvpuaIRSyGofe8D+q+MoWSBFG-kuOgOS06pghUtTUTimbGFGuJ+SJlqBYWaGOoeDCmT2CiIKYSI2YMsXxU5wGwr0VT6I0-ZRhl4w8cJCG5QW24to6sDoEsSxwKFXbiRFZWflJkKgZ5zUzuYnnxh0DUmKmeq+LGWgdZMa7dXMSH5SFTqnsgJUSZFurSXNlgLQIS1dOqzg9DUKYceROhKAM2UHUZQU7g6j5jS+E3mVNVQaFVdlxc0jnqtR6h3Q9oHGFYViZr9eH-cdQMYfSVb4Bdk2lBVFQxfZcMJcBcI9POd0QqorjNFjhlHX1BXAywg3DaNxPg3KTQ9F45GqO5pieaYk5qbiPiWLioEWHirMbnlHP3lzWHnWFYOkfCD0sCLdRjDoEvy4xEtQm5+oee9tTcf4QA */
  id: 'routingSamples',
  context: ({ input }) => ({
    condition: input.condition,
    definition: input.definition,
    approximateMatchingPercentage: undefined,
    documents: [],
    documentsError: undefined,
    approximateMatchingPercentageError: undefined,
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
              invoke: {
                id: 'collectDocuments',
                src: 'collectDocuments',
                input: ({ context }) => ({
                  condition: context.condition,
                  definition: context.definition,
                }),
                onSnapshot: {
                  guard: ({ event }) => event.snapshot.context !== undefined,
                  actions: [
                    {
                      type: 'storeDocuments',
                      params: ({ event }) => ({ documents: event.snapshot.context ?? [] }),
                    },
                  ],
                },
                onDone: {
                  target: 'success',
                },
                onError: {
                  target: 'error',
                  actions: [
                    {
                      type: 'storeDocumentsError',
                      params: ({ event }) => ({ error: event.error as Error }),
                    },
                  ],
                },
              },
            },
            success: {
              type: 'final',
            },
            error: {
              on: {
                'routingSamples.retry': {
                  target: 'loading',
                },
              },
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
                }),
                onSnapshot: {
                  guard: ({ event }) => event.snapshot.context !== undefined,
                  actions: [
                    {
                      type: 'storeDocumentCounts',
                      params: ({ event }) => ({ count: event.snapshot.context ?? '' }),
                    },
                  ],
                },
                onDone: {
                  target: 'success',
                },
                onError: {
                  target: 'error',
                  actions: [
                    {
                      type: 'storeDocumentCountsError',
                      params: ({ event }) => ({ error: event.error as Error }),
                    },
                  ],
                },
              },
            },
            success: {
              type: 'final',
            },
            error: {
              on: {
                'routingSamples.retry': 'loading',
              },
            },
          },
        },
      },
    },
  },
});

export interface RoutingSamplesMachineDeps {
  data: DataPublicPluginStart;
  timeState$: TimefilterHook['timeState$'];
}

export const createRoutingSamplesMachineImplementations = ({
  data,
  timeState$,
}: RoutingSamplesMachineDeps): MachineImplementationsFrom<typeof routingSamplesMachine> => ({
  actors: {
    collectDocuments: createDocumentsCollectorActor({ data }),
    collectDocumentsCount: createDocumentsCountCollectorActor({ data }),
    subscribeTimeUpdates: createTimeUpdatesActor({ timeState$ }),
  },
});

export function createDocumentsCollectorActor({ data }: Pick<RoutingSamplesMachineDeps, 'data'>) {
  return fromObservable<SampleDocument[], Pick<SearchParams, 'condition' | 'definition'>>(
    ({ input }) => {
      return collectDocuments({ data, searchParams: input });
    }
  );
}

export function createDocumentsCountCollectorActor({
  data,
}: Pick<RoutingSamplesMachineDeps, 'data'>) {
  return fromObservable<string | undefined, Pick<SearchParams, 'condition' | 'definition'>>(
    ({ input }) => {
      return collectDocumentCounts({ data, searchParams: input });
    }
  );
}

function createTimeUpdatesActor({ timeState$ }: Pick<RoutingSamplesMachineDeps, 'timeState$'>) {
  return fromEventObservable(() =>
    timeState$.pipe(map(() => ({ type: 'routingSamples.refresh' })))
  );
}

/**
 * Creates a timestamp range query object for Elasticsearch
 */
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

  const wiredMappedFields =
    'wired' in definition.stream.ingest ? definition.stream.ingest.wired.fields : {};
  const mappedFields = Object.keys(wiredMappedFields).concat(
    Object.keys(definition.inherited_fields)
  );

  return Object.fromEntries(
    getConditionFields(condition)
      .filter((field) => !mappedFields.includes(field.name))
      .map((field) => [
        field.name,
        { type: field.type === 'string' ? 'keyword' : 'double' } as MappingRuntimeField,
      ])
  );
}

/**
 * Processes condition to handle empty equals to always conversion
 */
function processCondition(condition?: Condition): Condition | undefined {
  if (!condition) return undefined;
  const convertedCondition = emptyEqualsToAlways(condition);
  return convertedCondition && isAlwaysCondition(convertedCondition)
    ? undefined
    : convertedCondition;
}

function handleTimeoutError(error: Error) {
  if (error.name === 'TimeoutError') {
    return throwError(
      () =>
        new Error(
          i18n.translate('xpack.streams.routingSamples.documentsSearchTimeoutErrorMessage', {
            defaultMessage: 'Documents search timed out after 10 seconds.',
          })
        )
    );
  }
  return throwError(() => error);
}

/**
 * Extracts documents from search result
 */
function extractDocumentsFromResult(result: IEsSearchResponse): SampleDocument[] {
  return result.rawResponse.hits.hits.map((hit) => hit._source);
}

/**
 * Builds search parameters for documents query
 */
function buildDocumentsSearchParams({ condition, start, end, definition }: SearchParams) {
  const finalCondition = processCondition(condition);
  const runtimeMappings = getRuntimeMappings(definition, finalCondition);

  return {
    index: definition.stream.name,
    body: {
      runtime_mappings: runtimeMappings,
      query: {
        bool: {
          must: [
            finalCondition ? conditionToQueryDsl(finalCondition) : { match_all: {} },
            createTimestampRangeQuery(start, end),
          ],
        },
      },
      size: SAMPLES_SIZE,
      sort: [{ '@timestamp': { order: 'desc' as const } }],
      terminate_after: SAMPLES_SIZE,
      track_total_hits: false,
    },
  };
}

/**
 * Builds search parameters for document count query
 */
function buildDocumentCountSearchParams({ start, end, definition }: SearchParams) {
  return {
    index: definition.stream.name,
    body: {
      query: createTimestampRangeQuery(start, end),
      size: 0,
      track_total_hits: true,
    },
  };
}

/**
 * Builds search parameters for document count query
 */
function buildDocumentCountProbabilitySearchParams({
  condition,
  definition,
  docCount,
  end,
  start,
}: SearchParams & { docCount?: number }) {
  const finalCondition = processCondition(condition);
  const runtimeMappings = getRuntimeMappings(definition, finalCondition);
  const query = finalCondition ? conditionToQueryDsl(finalCondition) : { match_all: {} };
  const probability = calculateProbability(docCount);

  return {
    index: definition.stream.name,
    body: {
      runtime_mappings: runtimeMappings,
      query: createTimestampRangeQuery(start, end),
      size: 0,
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
    },
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

/**
 * Collects sample documents using Elasticsearch search
 */
function collectDocuments({ data, searchParams }: CollectorParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();

  const { start, end } = getAbsoluteTimestamps(data);
  const params = buildDocumentsSearchParams({ ...searchParams, start, end });

  return new Observable((observer) => {
    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal })
      .pipe(
        timeout(SEARCH_TIMEOUT_MS),
        // filter((result) => Boolean(result.rawResponse.hits.hits)),
        map(extractDocumentsFromResult),
        catchError(handleTimeoutError)
      )
      .subscribe(observer);

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

/**
 * Collects document counts with sampling for percentage calculation
 */
function collectDocumentCounts({
  data,
  searchParams,
}: CollectorParams): Observable<string | undefined> {
  const abortController = new AbortController();

  const { start, end } = getAbsoluteTimestamps(data);
  const params = buildDocumentCountSearchParams({ ...searchParams, start, end });

  return new Observable((observer) => {
    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal })
      .pipe(
        filter((result) => !isRunningResponse(result)),
        timeout(SEARCH_TIMEOUT_MS),
        switchMap((countResult) => {
          const docCount =
            countResult.rawResponse.hits.total &&
            typeof countResult.rawResponse.hits.total !== 'number' &&
            'value' in countResult.rawResponse.hits.total
              ? countResult.rawResponse.hits.total.value
              : countResult.rawResponse.hits.total;

          return data.search
            .search(
              {
                params: buildDocumentCountProbabilitySearchParams({
                  ...searchParams,
                  start,
                  end,
                  docCount,
                }),
              },
              { abortSignal: abortController.signal }
            )
            .pipe(
              filter((result) => !isRunningResponse(result)),
              timeout(SEARCH_TIMEOUT_MS),
              map((result) => {
                if (result.rawResponse.aggregations) {
                  const sampleAgg = result.rawResponse.aggregations.sample as {
                    doc_count: number;
                    probability: number;
                    matching_docs: { doc_count: number };
                  };
                  const randomSampleDocCount = sampleAgg.doc_count / sampleAgg.probability;
                  const matchingDocCount = sampleAgg.matching_docs.doc_count;
                  const percentage = (100 * matchingDocCount) / randomSampleDocCount;
                  return percentage.toFixed(2);
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

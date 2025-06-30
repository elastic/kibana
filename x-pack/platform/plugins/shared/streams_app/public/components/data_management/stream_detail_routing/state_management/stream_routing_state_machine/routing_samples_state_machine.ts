/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setup, assign, ActorRefFrom, fromObservable, MachineImplementationsFrom } from 'xstate5';
import { Observable, filter, map, switchMap, firstValueFrom } from 'rxjs';
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
import { emptyEqualsToAlways } from '../../../../../util/condition';

// Types
export interface RoutingSamplesInput {
  condition?: Condition;
  start: number;
  end: number;
  size?: number;
  streamDefinition: Streams.WiredStream.GetResponse;
  data: DataPublicPluginStart;
}

export interface RoutingSamplesContext {
  condition?: Condition;
  start: number;
  end: number;
  size?: number;
  streamDefinition: Streams.WiredStream.GetResponse;
  data: DataPublicPluginStart;
  documents: SampleDocument[];
  documentsError?: Error;
  documentCountsError?: Error;
  approximateMatchingPercentage?: string;
}

export type RoutingSamplesEvent =
  | { type: 'refresh' }
  | {
      type: 'updateOptions';
      options: Partial<Pick<RoutingSamplesInput, 'condition' | 'start' | 'end' | 'size'>>;
    };

export type RoutingSamplesActorRef = ActorRefFrom<typeof routingSamplesMachine>;

// Shared interfaces
interface SearchParams {
  condition?: Condition;
  start: number;
  end: number;
  size?: number;
  streamDefinition: Streams.WiredStream.GetResponse;
}

interface SearchInput {
  data: DataPublicPluginStart;
  searchParams: SearchParams;
}

// Helper functions
const PROBABILITY_THRESHOLD = 100000;

/**
 * Create runtime mappings for fields that aren't mapped.
 * Conditions could be using fields which are not indexed or they could use it with other types than they are eventually mapped as.
 * Because of this we can't rely on mapped fields to draw a sample, instead we need to use runtime fields to simulate what happens during
 * ingest in the painless condition checks.
 */
function getRuntimeMappings(
  streamDefinition: Streams.WiredStream.GetResponse,
  condition?: Condition
): MappingRuntimeFields {
  if (!condition) return {};

  const wiredMappedFields =
    'wired' in streamDefinition.stream.ingest ? streamDefinition.stream.ingest.wired.fields : {};
  const mappedFields = Object.keys(wiredMappedFields).concat(
    Object.keys(streamDefinition.inherited_fields)
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

/**
 * Validates if the search result contains hits
 */
function isValidSearchResult(result: IEsSearchResponse): boolean {
  return !isRunningResponse(result) && result.rawResponse.hits?.hits !== undefined;
}

/**
 * Extracts documents from search result
 */
function extractDocumentsFromResult(result: IEsSearchResponse): SampleDocument[] {
  return result.rawResponse.hits.hits.map((hit) => hit._source as SampleDocument);
}

/**
 * Builds search parameters for documents query
 */
function buildDocumentsSearchParams({
  condition,
  start,
  end,
  size = 500,
  streamDefinition,
}: SearchParams) {
  const finalCondition = processCondition(condition);
  const runtimeMappings = getRuntimeMappings(streamDefinition, finalCondition);
  const query = finalCondition ? conditionToQueryDsl(finalCondition) : { match_all: {} };

  return {
    index: streamDefinition.stream.name,
    body: {
      runtime_mappings: runtimeMappings,
      query: {
        bool: {
          must: [query],
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                },
              },
            },
          ],
        },
      },
      size,
      sort: [{ '@timestamp': { order: 'desc' as const } }],
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
function collectDocuments({ data, searchParams }: SearchInput): Observable<SampleDocument[]> {
  const abortController = new AbortController();
  const params = buildDocumentsSearchParams({
    ...searchParams,
    streamDefinition: searchParams.streamDefinition,
  });

  return new Observable((observer) => {
    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal })
      .pipe(filter(isValidSearchResult), map(extractDocumentsFromResult))
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
}: SearchInput): Observable<string | undefined> {
  const abortController = new AbortController();
  const { condition, start, end, streamDefinition } = searchParams;
  const finalCondition = processCondition(condition);
  const runtimeMappings = getRuntimeMappings(streamDefinition, finalCondition);
  const query = finalCondition ? conditionToQueryDsl(finalCondition) : { match_all: {} };

  // First get document count for sample rate calculation
  const countParams = {
    index: streamDefinition.stream.name,
    body: {
      query: {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
          },
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return new Observable((observer) => {
    const subscription = data.search
      .search({ params: countParams }, { abortSignal: abortController.signal })
      .pipe(
        filter((result) => !isRunningResponse(result)),
        switchMap((countResult) => {
          const docCount =
            countResult.rawResponse.hits.total &&
            typeof countResult.rawResponse.hits.total !== 'number' &&
            'value' in countResult.rawResponse.hits.total
              ? countResult.rawResponse.hits.total.value
              : countResult.rawResponse.hits.total;

          const probability = calculateProbability(docCount);

          // Build final search with calculated probability
          const finalParams = {
            index: streamDefinition.stream.name,
            body: {
              runtime_mappings: runtimeMappings,
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: start,
                          lte: end,
                        },
                      },
                    },
                  ],
                },
              },
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

          return data.search.search(
            { params: finalParams },
            { abortSignal: abortController.signal }
          );
        }),
        filter((result) => !isRunningResponse(result)),
        map((result) => {
          if (result.rawResponse?.aggregations) {
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
        })
      )
      .subscribe(observer);

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

export const routingSamplesMachine = setup({
  types: {
    input: {} as RoutingSamplesInput,
    context: {} as RoutingSamplesContext,
    events: {} as RoutingSamplesEvent,
  },
  actors: {
    collectDocuments: getPlaceholderFor(createDocumentsCollectorActor),
    collectDocumentsCount: getPlaceholderFor(createDocumentsCountCollectorActor),
  },
  actions: {
    initializeContext: assign(({ input }) => ({
      condition: input.condition,
      start: input.start,
      end: input.end,
      size: input.size,
      streamDefinition: input.streamDefinition,
      data: input.data,
      documents: [],
      documentsError: undefined,
      documentCountsError: undefined,
      approximateMatchingPercentage: undefined,
    })),
    updateOptions: assign(({ context, event }) => {
      if (event.type !== 'updateOptions') return {};
      return {
        ...event.options,
      };
    }),
    storeDocuments: assign(({ event }) => {
      if (event.type !== 'xstate.done.actor.documentsFetcher') return {};
      return {
        documents: event.output,
        documentsError: undefined,
      };
    }),
    storeDocumentsError: assign(({ event }) => {
      if (event.type !== 'xstate.error.actor.documentsFetcher') return {};
      return {
        documentsError: event.error as Error,
      };
    }),
    storeDocumentCounts: assign(({ event }) => {
      if (event.type !== 'xstate.done.actor.documentCountsFetcher') return {};
      return {
        approximateMatchingPercentage: event.output,
        documentCountsError: undefined,
      };
    }),
    storeDocumentCountsError: assign(({ event }) => {
      if (event.type !== 'xstate.error.actor.documentCountsFetcher') return {};
      return {
        documentCountsError: event.error as Error,
      };
    }),
    clearData: assign(() => ({
      documents: [],
      approximateMatchingPercentage: undefined,
      documentsError: undefined,
      documentCountsError: undefined,
    })),
  },
  guards: {
    hasValidTimeRange: ({ context }) => Boolean(context.start && context.end),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGUBDAWwAcAbOAYmTADM7YALAbQAYBdRUM1WbDlS4eIAB6IALACYANCACeiAIwBmdgDoAbKukB2VQE4ArJIAce5YbNmAvrfloseQqUo10ZCEUxgA8mRCuLAc3EggfAJBohIIMvJKCNL6GuxmxmZapjKqylpmkvaOGDj4xORUsBrYEFS0DExsXKKRgtjCMSpGGoZa5pLsuXrG7MoJUtKGGqrGhurq0mqGhuxaRSBOpa4VcNW1YNSe3r4BQSHN4a3R4bHKksap0qqSz6vDo+MIxlpaGnpmymU-0Md2WawcGxKLnK7iqNTqoRa-DaHRuKhSI3+7BWWneY0UiC01mmxmMRnSGVmqnWm2hbkqGnoYEwAGNmC5qBBhGANLBMD4ebSyvTdkzWez8IjLsjrqBbpJJH9VGZpAVSTZAWpPqoiRpkn0VjYQcpjPoaVDhTsqmK2S4NFyWegSGBcJgqhRUEQIByubgeXgAG6oADWPIdTpdboAYsy2WBkFLeDL2iI0QgzCZtKNjMMDICFapPtJcRpJMsTJqnkNzc5LbDGbGJVB7ahHc7Xe7Pd78NR42hkBpKD56KhkCQW23I7AY+L44mIsnUXLEBmHlps7ncncXtr1z0yew9JZFmkfjWtjCGTamxOI66AMIYDsaD1en3c6q4IOh2-tzCP9AOxnOMEwuJMohTToEBBNcT2sGDvmUMxPmMPI9SyUllRzSQgXPOkrQbcU7XDP8AOfV9uygXtkH7QcKGHUdxxIyMyOjRs5zAhcIKXcREBBX5VRWAwdFyPpJE+PQFQ0DJDEsSS9EWIk9HsCFcFQCA4FEIVtlhJFuNTZcEAAWi0T4jJkVJ2CsrJDGLZQ0j0dhCghbTL12eEwD0lEDN4uI5AJBBVD0KZMmkF5VgzMxRlUakXItHSr0bFwvNlXyZEVQTD0WSQsmxUyAvuUty1eAwM2USZwWKWsEtFJL8F-KcUsgtNJAU7QBh0HKcpGXpPiBKZyzmAZSpBWKqovEVrTq5tmPIrtkulfSoNNTQ+lWZ4+ly3qAtVTR9VNRZhi0RY8LrRKiPq2a3V5dAWRZOB4EW7yoMBaRNBwgZelMYtzH8xJVTMPVi1QoxTxmaRTpqqaLpm1s72uvtRyanjbnK967jy76+hVbUAW0YKdGWIFQZNSG3Oh21Lrh0inzdZGfNiVrpD1DMsruLb8sSGRAb0DCyXSSTcLi6rycIynYcnB9ac7N98Hp5a3pZoTso5z4tDQt68lkpYVhBMnJrFm8rtYqpYFu+7YEe8DnrTQF-g0KwyXUI8rMPNX1GkmZ2EmaRZksFV9YI69iOpljpY0RHkHl22rHenN2FQySfl5znEFzB2FQGU18la3IVNsIA */
  id: 'routingSamples',
  context: ({ input }) => ({
    condition: input.condition,
    start: input.start,
    end: input.end,
    size: input.size,
    streamDefinition: input.streamDefinition,
    data: input.data,
    documents: [],
    documentsError: undefined,
    documentCountsError: undefined,
    approximateMatchingPercentage: undefined,
  }),
  initial: 'idle',
  states: {
    idle: {
      always: {
        target: 'fetching',
        guard: 'hasValidTimeRange',
      },
      on: {
        refresh: {
          target: 'fetching',
          guard: 'hasValidTimeRange',
        },
        updateOptions: {
          target: 'fetching',
          guard: 'hasValidTimeRange',
          actions: ['updateOptions'],
        },
      },
    },
    fetching: {
      entry: ['clearData'],
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
                  data: context.data,
                  searchParams: {
                    condition: context.condition,
                    start: context.start,
                    end: context.end,
                    size: context.size,
                    streamDefinition: context.streamDefinition,
                  },
                }),
                onDone: {
                  target: 'success',
                  actions: ['storeDocuments'],
                },
                onError: {
                  target: 'error',
                  actions: ['storeDocumentsError'],
                },
              },
            },
            success: {
              type: 'final',
            },
            error: {
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
                  data: context.data,
                  searchParams: {
                    condition: context.condition,
                    start: context.start,
                    end: context.end,
                    streamDefinition: context.streamDefinition,
                  },
                }),
                onDone: {
                  target: 'success',
                  actions: ['storeDocumentCounts'],
                },
                onError: {
                  target: 'error',
                  actions: ['storeDocumentCountsError'],
                },
              },
            },
            success: {
              type: 'final',
            },
            error: {
              type: 'final',
            },
          },
        },
      },
      onDone: {
        target: 'idle',
      },
    },
  },
  on: {
    refresh: {
      target: '.fetching',
      guard: 'hasValidTimeRange',
    },
    updateOptions: {
      target: '.fetching',
      guard: 'hasValidTimeRange',
      actions: ['updateOptions'],
    },
  },
});

export interface RoutingSamplesMachineDeps {
  data: DataPublicPluginStart;
}

export const createRoutingSamplesMachineImplementations = ({
  data,
}: RoutingSamplesMachineDeps): MachineImplementationsFrom<typeof routingSamplesMachine> => ({
  actors: {
    collectDocuments: createDocumentsCollectorActor({ data }),
    collectDocumentsCount: createDocumentsCountCollectorActor({ data }),
  },
});

export function createDocumentsCollectorActor({ data }: Pick<RoutingSamplesMachineDeps, 'data'>) {
  return fromObservable<SampleDocument[], SearchParams>(({ input }) => {
    return collectDocuments({ data, searchParams: input });
  });
}

export function createDocumentsCountCollectorActor({
  data,
}: Pick<RoutingSamplesMachineDeps, 'data'>) {
  return fromObservable<string | undefined, SearchParams>(({ input }) => {
    return collectDocumentCounts({ data, searchParams: input });
  });
}

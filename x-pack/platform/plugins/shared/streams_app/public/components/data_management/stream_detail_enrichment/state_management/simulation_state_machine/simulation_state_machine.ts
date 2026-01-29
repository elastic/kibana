/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { Condition, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { conditionToESQL, isConditionBlock } from '@kbn/streamlang';
import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { isEmpty } from 'lodash';
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate5';
import { assign, fromPromise, setup } from 'xstate5';
import { filter, timeout, map, catchError, throwError } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { MappedSchemaField } from '../../../schema_editor/types';
import { getValidSteps } from '../../utils';
import { selectSamplesForSimulation } from './selectors';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import {
  createSimulationRunFailureNotifier,
  createSimulationRunnerActor,
} from './simulation_runner_actor';
import type {
  SampleDocumentWithUIAttributes,
  Simulation,
  SimulationContext,
  SimulationEvent,
  SimulationInput,
  SimulationMachineDeps,
} from './types';
import { getSchemaFieldsFromSimulation, mapField, unmapField } from './utils';
import { executeEsqlQuery } from '../../../../../hooks/use_execute_esql_query';

export type SimulationActorRef = ActorRefFrom<typeof simulationMachine>;
export type SimulationActorSnapshot = SnapshotFrom<typeof simulationMachine>;
export interface StepsEventParams {
  steps: StreamlangStepWithUIAttributes[];
}

const hasSamples = (samples: SampleDocumentWithUIAttributes[]) => !isEmpty(samples);

const hasAnyValidSteps = (steps: StreamlangStepWithUIAttributes[]) => {
  const validSteps = getValidSteps(steps);
  return validSteps.length > 0;
};

export const simulationMachine = setup({
  types: {
    input: {} as SimulationInput,
    context: {} as SimulationContext,
    events: {} as SimulationEvent,
  },
  actors: {
    runSimulation: getPlaceholderFor(createSimulationRunnerActor),
    fetchMoreDocuments: getPlaceholderFor(createFetchMoreDocumentsActor),
  },
  actions: {
    notifySimulationRunFailure: getPlaceholderFor(createSimulationRunFailureNotifier),
    storePreviewDocsFilter: assign((_, params: { filter: PreviewDocsFilterOption }) => ({
      previewDocsFilter: params.filter,
    })),
    storeSteps: assign((_, params: StepsEventParams) => {
      return { steps: params.steps };
    }),
    storeSamples: assign((_, params: { samples: SampleDocumentWithUIAttributes[] }) => ({
      samples: params.samples,
    })),
    storeSimulation: assign(({ context }, params: { simulation: Simulation | undefined }) => ({
      simulation: params.simulation,
      baseSimulation: context.selectedConditionId ? context.baseSimulation : params.simulation,
    })),
    storeExplicitlyEnabledPreviewColumns: assign(({ context }, params: { columns: string[] }) => ({
      explicitlyEnabledPreviewColumns: params.columns,
      explicitlyDisabledPreviewColumns: context.explicitlyDisabledPreviewColumns.filter(
        (col) => !params.columns.includes(col)
      ),
    })),
    storeExplicitlyDisabledPreviewColumns: assign(({ context }, params: { columns: string[] }) => ({
      explicitlyDisabledPreviewColumns: params.columns,
      explicitlyEnabledPreviewColumns: context.explicitlyEnabledPreviewColumns.filter(
        (col) => !params.columns.includes(col)
      ),
    })),
    storePreviewColumnsOrder: assign((_, params: { columns: string[] }) => ({
      previewColumnsOrder: params.columns,
    })),
    storePreviewColumnsSorting: assign(
      (_, params: { sorting: SimulationContext['previewColumnsSorting'] }) => ({
        previewColumnsSorting: params.sorting,
      })
    ),
    deriveDetectedSchemaFields: assign(({ context }) => {
      const result = getSchemaFieldsFromSimulation(context);
      return {
        detectedSchemaFields: result.detectedSchemaFields,
        detectedSchemaFieldsCache: result.detectedSchemaFieldsCache,
      };
    }),
    mapField: assign(({ context }, params: { field: MappedSchemaField }) => {
      const result = mapField(context, params.field);
      return {
        detectedSchemaFields: result.detectedSchemaFields,
        detectedSchemaFieldsCache: result.detectedSchemaFieldsCache,
      };
    }),
    unmapField: assign(({ context }, params: { fieldName: string }) => {
      const result = unmapField(context, params.fieldName);
      return {
        detectedSchemaFields: result.detectedSchemaFields,
        detectedSchemaFieldsCache: result.detectedSchemaFieldsCache,
      };
    }),
    resetSimulationOutcome: assign({
      detectedSchemaFields: [],
      explicitlyEnabledPreviewColumns: [],
      explicitlyDisabledPreviewColumns: [],
      previewColumnsOrder: [],
      simulation: undefined,
      baseSimulation: undefined,
      previewDocsFilter: 'outcome_filter_all',
    }),
    resetSteps: assign({ steps: [] }),
    resetSamples: assign({
      samples: [],
      selectedConditionId: undefined,
    }),
    applyConditionFilter: assign((_, params: { conditionId: string }) => {
      return {
        selectedConditionId: params.conditionId,
      };
    }),
    clearConditionFilter: assign(() => {
      return {
        selectedConditionId: undefined,
      };
    }),
    setFetchingMore: assign(() => ({
      isFetchingMore: true,
      fetchMoreError: undefined,
    })),
    appendSamples: assign(({ context }, params: { samples: SampleDocumentWithUIAttributes[] }) => {
      // Merge new samples with existing ones, avoiding duplicates
      const existingIds = new Set(context.samples.map((sample) => getDocumentId(sample.document)));
      const newSamples = params.samples.filter(
        (sample) => !existingIds.has(getDocumentId(sample.document))
      );
      return {
        samples: [...context.samples, ...newSamples],
        isFetchingMore: false,
        fetchMoreError: undefined,
      };
    }),
    storeFetchMoreError: assign((_, params: { error: Error }) => ({
      isFetchingMore: false,
      fetchMoreError: params.error,
    })),
  },
  delays: {
    processorChangeDebounceTime: 300,
  },
  guards: {
    canSimulate: ({ context }) => hasAnyValidSteps(context.steps),
    hasSteps: (_, params: StepsEventParams) => !isEmpty(params.steps),
    '!hasSamples': (_, params: { samples: SampleDocumentWithUIAttributes[] }) =>
      !hasSamples(params.samples),
    canFetchMore: ({ context }) => {
      return (
        context.selectedConditionId !== undefined &&
        !context.isFetchingMore &&
        context.samples.length > 0
      );
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYlU1wJIDoBjACx2JgAUAnMANxTAHcAIoTqwAYiix4w7ANoAGALqJQAB0KpqxZSAAeiAGwBmAJw1DAJgAs544cOWAHPoeGAjABoQAT0SvzAX39PCmx8IjIQqnCaTlgwPHklJBA1DXDtPQQAVgB2Tx8EV30cyxobfXNDEstLVztDQOD0UM1yZqjaTjowFC4wAH1YKRVYRO1UlE0MxFz8xGtXGgcsh2M5OVtXV0sjHMaQSLCSNsoj4hiwbt6B2Bw0FSw4MeSJqeTM2e9fStLcnP1XE4snZbA59odWhDol0en1BncHk9XElVOpJul3jM8l9soCzH5XHJlkS5NVwe0zicWtDLrCbgjHqNzCiUmi3qAPtiCtssqVLFVDMsbOZ9FkReTTq0VJwePwAMKELAYNDEWA0DAqCD4MAAUR0DxQdEmWC8OuIOAARo8IAqlSrRopxmyMRysXNCnUHDQ-DUtqT9DsVhLqcdpdxeHxbcrVerNdq9QajXgTQIULcrZAo-bnqi0iRptkub4csYcjQcnJzOYciZrHJXMYssGOmQw7LI4ro2rCOwINIc6y81pMYX3YTajRin45PZjI2qmCggcKVKZRGszG4ngAMo9ggsAevF26N04uq5GjGBy1HK31y5KyWZuUoZgFT0JgsMCH535kefApqz5ORciyLJCQqVwSybJcoWOV93z7R4pB-IcCwA4sy0bEUcgcKC5Esetn0hYYaCQ+Jv2RJ00P-ItCjAuQljWUkZxAup9GI6IUAgR4qRbGgADNeCwCA1TQHAVFQ9E-1dQp1kYqtRRrMDCKJMc7CyJYslLLJ9AIgFLBgppJS4niwD4s5BOE0T1WIcTJMdF5f2HWTCXWMoRVyQwVPWBwx35cx8XKQwKkMUkGlgldoj7C1CAwYgjRYOVPxgWBSB0IZtRoHABKkdgAAppWEOBYB7ZLmBgAQwFi+LugAFXQMAAEoLM0MjqrihKUCSlKnkc3NpJck85PcxSvJ8tScQsUpBUqPDgTkYor042gcFgOJ2H3KAACUwAARwwFBODQMBiDwNKpPZYatiKGh+RybT6wbMVLHdfQKhoGcHByPxymBa8VvONaNq23aDqOsATrOi6qKcmjXMWr1inMRbDPrRaPDPKxDEvRaAXMQF7BewGYni4huqgbcouOCASDAGhuq4QgAGt6bg4htrJ6QAEE6DwHtLuPTJLEbMw1gDXkKxKBwCPdb6cbnQE6hFCocnFSKTM6MmKapzWyGkdgexoB58AEns0BodnOeIYgeb5gX+sHQaCxFzSTFRyXSUcWWcVwxj-oDPDRSyesYKXYhCD7eBknZ6jnZHYx3TWO6xWcEOfRcSw9g1kNzm4x446uzI8MCwm3FLGWbF0sdqxxkOHBRytwIegGc-4mLOsSqByq-aOBqLxBcLdlGibAh71kMd0LBx2aq2MUVtjWCLjNz7L1ukUH9sO47TvOwuhd8CxFm0wUK35ZZCTo4FTH+DYjBR96HFWEn2G1lhddz-eZOuuoylyb6G7GDRhsSeOJRT6EvOxNWfhdIAjDv4IAA */
  id: 'simulation',
  context: ({ input }) => ({
    detectedSchemaFields: [],
    detectedSchemaFieldsCache: new Map(),
    previewDocsFilter: 'outcome_filter_all',
    explicitlyDisabledPreviewColumns: [],
    explicitlyEnabledPreviewColumns: [],
    previewColumnsOrder: [],
    previewColumnsSorting: { fieldName: undefined, direction: 'asc' },
    steps: input.steps,
    samples: [],
    selectedConditionId: undefined,
    streamName: input.streamName,
    streamType: input.streamType,
    baseSimulation: undefined,
    isFetchingMore: false,
    fetchMoreError: undefined,
  }),
  initial: 'idle',
  on: {
    'simulation.changePreviewDocsFilter': {
      actions: [{ type: 'storePreviewDocsFilter', params: ({ event }) => event }],
    },
    'simulation.reset': {
      target: '.idle',
      actions: [{ type: 'resetSimulationOutcome' }, { type: 'resetSteps' }],
    },
    'simulation.receive_steps': {
      target: '.assertingRequirements',
      actions: [{ type: 'storeSteps', params: ({ event }) => event }],
    },
    'simulation.receive_samples': [
      {
        guard: { type: '!hasSamples', params: ({ event }) => event },
        target: '.idle',
        actions: [{ type: 'resetSimulationOutcome' }, { type: 'resetSamples' }],
      },
      {
        guard: {
          type: 'hasSteps',
          params: ({ context }) => ({ steps: context.steps }),
        },
        target: '.assertingRequirements',
        actions: [{ type: 'storeSamples', params: ({ event }) => event }],
      },
      {
        target: '.idle',
        actions: [{ type: 'storeSamples', params: ({ event }) => event }],
      },
    ],
    'simulation.updateSteps': [
      {
        guard: {
          type: 'hasSteps',
          params: ({ event }) => ({ steps: event.steps }),
        },
        actions: [{ type: 'storeSteps', params: ({ event }) => event }],
        target: '.debouncingChanges',
      },
      {
        target: '.idle',
        actions: [{ type: 'resetSimulationOutcome' }, { type: 'resetSteps' }],
      },
    ],
    'simulation.filterByCondition': [
      {
        target: '.assertingRequirements',
        actions: [{ type: 'applyConditionFilter', params: ({ event }) => event }],
      },
    ],
    'simulation.clearConditionFilter': {
      target: '.assertingRequirements',
      actions: [{ type: 'clearConditionFilter' }],
    },
    'simulation.fetchMore': {
      guard: 'canFetchMore',
      target: '.fetchingMore',
    },
  },
  states: {
    idle: {
      on: {
        'simulation.fields.map': {
          target: 'assertingRequirements',
          actions: [{ type: 'mapField', params: ({ event }) => event }],
        },
        'simulation.fields.unmap': {
          target: 'assertingRequirements',
          actions: [{ type: 'unmapField', params: ({ event }) => event }],
        },
        'previewColumns.updateExplicitlyEnabledColumns': {
          actions: [
            {
              type: 'storeExplicitlyEnabledPreviewColumns',
              params: ({ event }) => event,
            },
          ],
        },
        'previewColumns.updateExplicitlyDisabledColumns': {
          actions: [
            {
              type: 'storeExplicitlyDisabledPreviewColumns',
              params: ({ event }) => event,
            },
          ],
        },
        'previewColumns.order': {
          actions: [
            {
              type: 'storePreviewColumnsOrder',
              params: ({ event }) => event,
            },
          ],
        },
        'previewColumns.setSorting': {
          actions: [
            {
              type: 'storePreviewColumnsSorting',
              params: ({ event }) => event,
            },
          ],
        },
      },
    },

    debouncingChanges: {
      after: {
        processorChangeDebounceTime: 'assertingRequirements',
      },
    },

    assertingRequirements: {
      always: [
        { guard: 'canSimulate', target: 'runningSimulation' },
        { target: 'idle', actions: [{ type: 'resetSimulationOutcome' }] },
      ],
    },

    runningSimulation: {
      invoke: {
        id: 'simulationRunnerActor',
        src: 'runSimulation',
        input: ({ context }) => ({
          streamName: context.streamName,
          documents: selectSamplesForSimulation(context)
            .map((doc) => doc.document)
            .map(flattenObjectNestedLast) as FlattenRecord[],
          steps: getValidSteps(context.steps),
          detectedFields: context.detectedSchemaFields,
        }),
        onDone: {
          target: 'idle',
          actions: [
            { type: 'storeSimulation', params: ({ event }) => ({ simulation: event.output }) },
            { type: 'deriveDetectedSchemaFields' },
          ],
        },
        onError: {
          target: 'idle',
          actions: [{ type: 'notifySimulationRunFailure' }],
        },
      },
    },

    fetchingMore: {
      entry: [{ type: 'setFetchingMore' }],
      invoke: {
        id: 'fetchMoreDocumentsActor',
        src: 'fetchMoreDocuments',
        input: ({ context }) => ({
          streamName: context.streamName,
          selectedConditionId: context.selectedConditionId,
          steps: context.steps,
          existingSamples: context.samples,
        }),
        onDone: {
          target: 'assertingRequirements',
          actions: [
            {
              type: 'appendSamples',
              params: ({ event }) => ({ samples: event.output }),
            },
          ],
        },
        onError: {
          target: 'idle',
          actions: [
            {
              type: 'storeFetchMoreError',
              params: ({ event }) => ({ error: event.error as Error }),
            },
          ],
        },
      },
    },
  },
});

export const createSimulationMachineImplementations = ({
  data,
  streamsRepositoryClient,
  toasts,
}: SimulationMachineDeps): MachineImplementationsFrom<typeof simulationMachine> => ({
  actors: {
    runSimulation: createSimulationRunnerActor({ streamsRepositoryClient }),
    fetchMoreDocuments: createFetchMoreDocumentsActor({ data }),
  },
  actions: {
    notifySimulationRunFailure: createSimulationRunFailureNotifier({ toasts }),
  },
});

// Constants for fetch more functionality
const FETCH_MORE_SIZE = 100;
const SEARCH_TIMEOUT_MS = 10000;

export interface FetchMoreInput {
  streamName: string;
  selectedConditionId?: string;
  steps: StreamlangStepWithUIAttributes[];
  existingSamples: SampleDocumentWithUIAttributes[];
}

/**
 * Creates a unique identifier for a document based on its content.
 * Used for deduplication when appending new samples.
 */
export function getDocumentId(doc: SampleDocument): string {
  return JSON.stringify(doc['@timestamp']) + JSON.stringify(doc);
}

/**
 * Finds the condition from the steps based on the selected condition ID.
 */
export function findConditionById(
  steps: StreamlangStepWithUIAttributes[],
  conditionId: string
): Condition | undefined {
  for (const step of steps) {
    if (isConditionBlock(step) && step.customIdentifier === conditionId) {
      // Extract the condition without the nested steps
      const { steps: _, ...conditionWithoutSteps } = step.condition;
      return conditionWithoutSteps as Condition;
    }
  }
  return undefined;
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
export function createFetchMoreDocumentsActor({ data }: Pick<SimulationMachineDeps, 'data'>) {
  return fromPromise<SampleDocumentWithUIAttributes[], FetchMoreInput>(
    async ({ input, signal }) => {
      return fetchMoreMatchingDocuments({ data, input, signal });
    }
  );
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
  data: SimulationMachineDeps['data'];
  input: FetchMoreInput;
  signal: AbortSignal;
}): Promise<SampleDocumentWithUIAttributes[]> {
  const { streamName, selectedConditionId, steps, existingSamples } = input;

  if (!selectedConditionId) {
    return [];
  }

  const condition = findConditionById(steps, selectedConditionId);
  if (!condition) {
    return [];
  }

  const { start, end } = getAbsoluteTimestamps(data);

  // Step 1: Build and execute ESQL query to get matching document IDs
  const esqlQuery = buildFetchMoreEsqlQuery(streamName, condition);

  const esqlResponse = await executeEsqlQuery({
    query: esqlQuery,
    search: data.search.search.bind(data.search),
    signal,
    start,
    end,
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
  const existingDocIds = new Set(existingSamples.map((sample) => getDocumentId(sample.document)));

  // Step 2: Fetch full documents by IDs
  const documents = await fetchDocumentsByIds({
    data,
    streamName,
    documentIds,
    signal,
  });

  // Convert to SampleDocumentWithUIAttributes and filter duplicates
  return documents
    .filter((doc) => !existingDocIds.has(getDocumentId(doc)))
    .map((doc) => ({
      dataSourceId: 'fetch-more',
      document: doc,
    }));
}

/**
 * Gets absolute timestamps from the data plugin's timefilter.
 */
function getAbsoluteTimestamps(data: SimulationMachineDeps['data']) {
  const time = data.query.timefilter.timefilter.getAbsoluteTime();

  return {
    start: new Date(time.from).getTime(),
    end: new Date(time.to).getTime(),
  };
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
  data: SimulationMachineDeps['data'];
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
          i18n.translate('xpack.streams.simulation.fetchMoreTimeoutErrorMessage', {
            defaultMessage:
              'Fetching additional documents timed out after 10 seconds. Please try again.',
          })
        )
    );
  }
  return throwError(() => error);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ActorRefFrom,
  MachineImplementationsFrom,
  SnapshotFrom,
  assign,
  fromEventObservable,
  setup,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  FlattenRecord,
  SampleDocument,
  isSchema,
  processorDefinitionSchema,
} from '@kbn/streams-schema';
import { isEmpty, isEqual } from 'lodash';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { BehaviorSubject, map } from 'rxjs';
import { TimeState } from '@kbn/es-query';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';
import {
  SimulationInput,
  SimulationContext,
  SimulationEvent,
  Simulation,
  SimulationMachineDeps,
  SimulationSearchParams,
} from './types';
import { PreviewDocsFilterOption, defaultSearch } from './simulation_documents_search';
import {
  createSamplesFetchActor,
  createSamplesFetchFailureNofitier,
} from './samples_fetcher_actor';
import {
  createSimulationRunnerActor,
  createSimulationRunFailureNofitier,
} from './simulation_runner_actor';
import {
  composeSamplingCondition,
  getSchemaFieldsFromSimulation,
  mapField,
  unmapField,
} from './utils';
import { MappedSchemaField } from '../../../schema_editor/types';

export type SimulationActorRef = ActorRefFrom<typeof simulationMachine>;
export type SimulationActorSnapshot = SnapshotFrom<typeof simulationMachine>;
export interface ProcessorEventParams {
  processors: ProcessorDefinitionWithUIAttributes[];
}

const hasSamples = (samples: SampleDocument[]) => !isEmpty(samples);

const isValidProcessor = (processor: ProcessorDefinitionWithUIAttributes) =>
  isSchema(processorDefinitionSchema, processorConverter.toAPIDefinition(processor));
const hasValidProcessors = (processors: ProcessorDefinitionWithUIAttributes[]) =>
  processors.every(isValidProcessor);

export const simulationMachine = setup({
  types: {
    input: {} as SimulationInput,
    context: {} as SimulationContext,
    events: {} as SimulationEvent,
  },
  actors: {
    fetchSamples: getPlaceholderFor(createSamplesFetchActor),
    runSimulation: getPlaceholderFor(createSimulationRunnerActor),
    subscribeTimeUpdates: getPlaceholderFor(createTimeUpdatesActor),
  },
  actions: {
    notifySamplesFetchFailure: getPlaceholderFor(createSamplesFetchFailureNofitier),
    notifySimulationRunFailure: getPlaceholderFor(createSimulationRunFailureNofitier),
    storeTimeUpdated: getPlaceholderFor(createSimulationRunFailureNofitier),
    storePreviewDocsFilter: assign((_, params: { filter: PreviewDocsFilterOption }) => ({
      previewDocsFilter: params.filter,
    })),
    storeProcessors: assign((_, params: ProcessorEventParams) => ({
      processors: params.processors,
    })),
    storeSamples: assign((_, params: { samples: SampleDocument[] }) => ({
      samples: params.samples,
    })),
    storeSearchParams: assign(
      ({ context }, params: { search: Partial<SimulationSearchParams> }) => {
        return {
          search: { ...context.search, ...params.search },
        };
      }
    ),
    storeSimulation: assign((_, params: { simulation: Simulation | undefined }) => ({
      simulation: params.simulation,
    })),
    deriveSamplingCondition: assign(({ context }) => ({
      samplingCondition: composeSamplingCondition(context.processors),
    })),
    deriveDetectedSchemaFields: assign(({ context }) => ({
      detectedSchemaFields: context.simulation
        ? getSchemaFieldsFromSimulation(
            context.simulation.detected_fields,
            context.detectedSchemaFields,
            context.streamName
          )
        : context.detectedSchemaFields,
    })),
    mapField: assign(({ context }, params: { field: MappedSchemaField }) => ({
      detectedSchemaFields: mapField(context.detectedSchemaFields, params.field),
    })),
    unmapField: assign(({ context }, params: { fieldName: string }) => ({
      detectedSchemaFields: unmapField(context.detectedSchemaFields, params.fieldName),
    })),
    resetSimulation: assign({
      processors: [],
      detectedSchemaFields: [],
      simulation: undefined,
      samplingCondition: composeSamplingCondition([]),
      previewDocsFilter: 'outcome_filter_all',
    }),
  },
  delays: {
    debounceTime: 800,
  },
  guards: {
    canSimulate: ({ context }, params: ProcessorEventParams) =>
      hasSamples(context.samples) && hasValidProcessors(params.processors),
    hasProcessors: (_, params: ProcessorEventParams) => !isEmpty(params.processors),
    hasSamples: ({ context }) => hasSamples(context.samples),
    hasValidProcessors: (_, params: ProcessorEventParams) => hasValidProcessors(params.processors),
    shouldRefetchSamples: ({ context }) =>
      Boolean(
        context.samplingCondition &&
          !isEqual(context.samplingCondition, composeSamplingCondition(context.processors))
      ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAIwB2AGwAWetICsnTgA5Js2cuUBOZQCYANCACeiALSTOh+rfUBmWdL3TpzzkYC+306kxcYTIA7HwiYnoAYwALWhgABQAnMAA3FDAAdwARQijYADEULDYkrl4kEAEhCNEJBFlHSXplFXVDPRl1ZVlNUwsES2VJR3oRw0dDeXUXR04ZX390MODSUKCI+hTYMDxy0WqUYLrEKdcx9T15ecNJPVlO6X6rQ3V6SddDdzd5K-llRyLEDrcIkUhMJJ5OCwQhJWD0ABU+0qh2OlXqkhmikc8kkhmU6hm+n08meg3xzU4-3aUy0kmmyiBINWEKhsBhSWitCiYCwyP4giOtXRpxGynoBhmhkMsipLlJ5isb2U13u8mk6qmRl0TOWGzBrJ57Nh0TidA4PAOgrRoHqhL07w6elpBL0GjJlkcDoBvWkcr0k0ahl1gVBZEN0JNEF5uwtFQFNREIoQ0oU9GmOlusr9KrJNkULlkmLdk2l6g0IZWEXBkKNHPo0awsfYknjVWtwttpzmdnkuNubk6KscZL7dkL8g+-3V0hllf1kRQxCFOCwKAAXkuoKR+e3E8QTggRo43r9NGOs6m87J6L0epxnZcFPIOvOw-Qlyu15u6DvW1b90PMVmnUdwvC8GxnSuMkXCUSCvE6B4mimN9ggbMAACNCAwYgoi3ABhM0YFgGs2XrWJ4jjAChSTLsEF+aQJXuTgNT0J9Og9HF7FVV4Az9RwCVkVDNmjLCcLwuhCMokixFgPBKHoHAADNSgAClE7DcLAAAVdAwAASjWPV3w08SCKIuBd1RTtxCkWwQJfRxpFAjwNUmPNOBvGQix0dUNHuV5hJIdCxNw8zpNIWT5LYRSVLAJJ1MwzSeV0tADKM0M0NMsLJIs2AWzbazaNso8WJvbR-leTRhlkExFRTXp7G0bQOmkcZXCEvxgWMtCsEIHAIC3ABlHA0CYJsSIgEgwA-YhUkIABrGbYFG8a4AKXZYnigBBKI8FhKyO2KjEVE4JrGnmRwvSuiYPLsVRJ1eB9XAEq4gsiPqBuG1aJtIeLIU5cb8CU2E0HoFaxomja8C2pJdv2spLRRI6D2TQx5jeSQeh6X4XxkBUBhse6qUmctB1e+R3sU9l4oIOghp6iIqDAABHDAUBSNLiDwEjDsA5N6SaehbhYr08SlOqBiLM7CU8kYri+Nr1CpnAaaSOmoAZzKmdZ9nObAbnef-ZH+bowWzvslVZVuFVMRgnRhZmOR3AZS6qaSHDl3pxmwSm4gZqXealvBn3iCoT2dr2g6kYTGjUbouQb1UVQ5g8IwVFkUdJiUUDdCcAE3Wmd3PeG0O-qSAH6CBvAQaSMHmSZiO4ajxHCpRw9nbGDx5kHbQvT0MkCUYrHrnkHR3C0QEgWIQho3gSoG+Kor45KvsHT0ZjWPYyROJPFpqSxhRug1Tgp6WbXgs-AhVw3LdqJtEqxRvOZBJUMeRnUAmlRvNr+-+XRMTlmkFTFAEAmz3xsvUQs9BP7qjxP8DeFIyQakUAhF2fxdAbyptlCSUApLmnnrHB+doRhKF6P8ekWhuh23qpILG6YaqT0QqfZ0VNPqDXpj9OAEDjpSF6M0CYk41StC9EYD01wmq2FlAGB4rw+yUy6ovSIqsdjq1LhfMOusOZgC5jzHhK8MQPAdNoDebhpTox6E8eqXxRi3BGM5U+E8R7F2IF7TWod9FAVsGdAk-9nSunlIPboYw5jZjmE5ekytfDeCAA */
  id: 'simulation',
  context: ({ input }) => ({
    detectedSchemaFields: [],
    previewDocsFilter: 'outcome_filter_all',
    previewDocuments: [],
    processors: input.processors,
    samples: [],
    samplingCondition: composeSamplingCondition(input.processors),
    search: input.search ?? defaultSearch,
    streamName: input.streamName,
  }),
  initial: 'loadingSamples',
  invoke: {
    id: 'subscribeTimeUpdatesActor',
    src: 'subscribeTimeUpdates',
  },
  on: {
    'dateRange.update': '.loadingSamples',
    'simulation.changePreviewDocsFilter': {
      actions: [{ type: 'storePreviewDocsFilter', params: ({ event }) => event }],
    },
    'simulation.changeSearchParams': {
      target: '.loadingSamples',
      actions: [{ type: 'storeSearchParams', params: ({ event }) => event }],
    },
    'simulation.reset': {
      target: '.idle',
      actions: [{ type: 'resetSimulation' }],
    },
    // Handle adding/reordering processors
    'processors.*': {
      target: '.assertingSimulationRequirements',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.cancel': {
      target: '.assertingSimulationRequirements',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.change': {
      target: '.debouncingChanges',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.delete': [
      {
        guard: {
          type: 'hasProcessors',
          params: ({ event }) => ({ processors: event.processors }),
        },
        target: '.assertingSimulationRequirements',
        actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
      },
      {
        target: '.idle',
        actions: [{ type: 'resetSimulation' }],
      },
    ],
  },
  states: {
    idle: {
      on: {
        'simulation.fields.map': {
          target: 'assertingSimulationRequirements',
          actions: [{ type: 'mapField', params: ({ event }) => event }],
        },
        'simulation.fields.unmap': {
          target: 'assertingSimulationRequirements',
          actions: [{ type: 'unmapField', params: ({ event }) => event }],
        },
      },
    },

    debouncingChanges: {
      on: {
        'processor.change': {
          target: 'debouncingChanges',
          actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
          description: 'Re-enter debouncing state and reinitialize the delayed processing.',
          reenter: true,
        },
      },
      after: {
        debounceTime: [
          {
            guard: 'shouldRefetchSamples',
            target: 'loadingSamples',
            actions: [{ type: 'deriveSamplingCondition' }],
          },
          { target: 'assertingSimulationRequirements' },
        ],
      },
    },

    loadingSamples: {
      invoke: {
        id: 'samplesFetcherActor',
        src: 'fetchSamples',
        input: ({ context }) => ({
          condition: context.samplingCondition,
          search: context.search,
          streamName: context.streamName,
        }),
        onSnapshot: [
          {
            guard: ({ event }) => event.snapshot.context === undefined,
          },
          {
            guard: {
              type: 'hasProcessors',
              params: ({ context }) => ({ processors: context.processors }),
            },
            target: 'assertingSimulationRequirements',
            actions: [
              {
                type: 'storeSamples',
                params: ({ event }) => ({ samples: event.snapshot.context ?? [] }),
              },
            ],
          },
          {
            target: 'idle',
            actions: [
              {
                type: 'storeSamples',
                params: ({ event }) => ({ samples: event.snapshot.context ?? [] }),
              },
            ],
          },
        ],
        onError: {
          target: 'idle',
          actions: [
            { type: 'storeSamples', params: () => ({ samples: [] }) },
            { type: 'notifySamplesFetchFailure' },
          ],
        },
      },
    },

    assertingSimulationRequirements: {
      always: [
        {
          guard: {
            type: 'canSimulate',
            params: ({ context }) => ({ processors: context.processors }),
          },
          target: 'runningSimulation',
        },
        { target: 'idle' },
      ],
    },

    runningSimulation: {
      invoke: {
        id: 'simulationRunnerActor',
        src: 'runSimulation',
        input: ({ context }) => ({
          streamName: context.streamName,
          documents: context.samples.map(flattenObjectNestedLast) as FlattenRecord[],
          processors: context.processors,
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
  },
});

export const createSimulationMachineImplementations = ({
  data,
  streamsRepositoryClient,
  toasts,
  timeState$,
}: SimulationMachineDeps): MachineImplementationsFrom<typeof simulationMachine> => ({
  actors: {
    fetchSamples: createSamplesFetchActor({ data, timeState$ }),
    runSimulation: createSimulationRunnerActor({ streamsRepositoryClient }),
    subscribeTimeUpdates: createTimeUpdatesActor({ timeState$ }),
  },
  actions: {
    notifySamplesFetchFailure: createSamplesFetchFailureNofitier({ toasts }),
    notifySimulationRunFailure: createSimulationRunFailureNofitier({ toasts }),
  },
});

function createTimeUpdatesActor({ timeState$ }: { timeState$: BehaviorSubject<TimeState> }) {
  return fromEventObservable(() => timeState$.pipe(map(() => ({ type: 'dateRange.update' }))));
}

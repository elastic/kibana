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
  raise,
  setup,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { FlattenRecord, isSchema, processorDefinitionSchema } from '@kbn/streams-schema';
import { isEmpty, isEqual } from 'lodash';
import {
  dateRangeMachine,
  createDateRangeMachineImplementations,
} from '../../../../../state_management/date_range_state_machine';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';
import {
  SimulationInput,
  SimulationContext,
  SimulationEvent,
  Simulation,
  SimulationMachineDeps,
} from './types';
import { PreviewDocsFilterOption } from './preview_docs_filter';
import {
  createSamplesFetchActor,
  createSamplesFetchFailureNofitier,
} from './samples_fetcher_actor';
import {
  createSimulationRunnerActor,
  createSimulationRunFailureNofitier,
} from './simulation_runner_actor';
import { filterSimulationDocuments, composeSamplingCondition } from './utils';

export type SimulationActorRef = ActorRefFrom<typeof simulationMachine>;
export type SimulationActorSnapshot = SnapshotFrom<typeof simulationMachine>;
export interface ProcessorEventParams {
  processors: ProcessorDefinitionWithUIAttributes[];
}

const hasSamples = (samples: FlattenRecord[]) => !isEmpty(samples);

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
    dateRangeMachine: getPlaceholderFor(() => dateRangeMachine),
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
    storeSamples: assign((_, params: { samples: FlattenRecord[] }) => ({
      samples: params.samples,
    })),
    storeSimulation: assign((_, params: { simulation: Simulation | undefined }) => ({
      simulation: params.simulation,
    })),
    derivePreviewDocuments: assign(({ context }) => {
      return {
        previewDocuments: context.simulation
          ? filterSimulationDocuments(context.simulation.documents, context.previewDocsFilter)
          : context.samples,
      };
    }),
    deriveSamplingCondition: assign(({ context }) => ({
      samplingCondition: composeSamplingCondition(context.processors),
    })),
    resetSimulation: assign({
      processors: [],
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
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAIwB2AGwAWetICsnTgA5Js2cuUBOZQCYANCACeiALSTOh+rfUBmWdL3TpzzkYC+306kxcYTIA7HwiYnoAYwALWhgABQAnMAA3FDAAdwARQijYADEULDYkrl4kEAEhCNEJBGlOR3pHT0NZQ2VJZUdpdVMLBEtHPUUbLqbGnUd9eV9-dDDg0iYkvLhYQiTYegAqctFqlGC6xENJEfsPPRGuvvVpAasZaXtDQ2dJTUN5dT11WTzEChIIRFZrKIbLbRWiQrAHSpHE6VeofeScegKNztSTtLzSeRPBCdDFo1w9W56PTdIEg8IkcHrWCbJLROJ0Dg8Q6CY61FGIdR-FqGKk-bp-DRE4Z6eg9WQPTjyWQ3dqOQy0xaghmrJks+gQMBYMBsBH8HnI0ComTqeyOF4yeS3TiPcyIXp2Rzqd5oxzyeQivQawL0sg6yHM6EGo0myQVM01ET84mGZ30f4-dNuR1E6SSRR236-bq9ZSuINLCL0FDEXk4LAoABe1agpFNVXNfMtUlaNvk-zz-vOHXaRK0mPUylknD0hj+Cn9gb8wM1IarNYIdcbzdbse5CeIpwQFy69AejVUExnoyJLiUNj0XmpyrtP3LWsiBoARoQMMQos2AGF2RgWBGXDPVYniTk43bfdDz7V4qSnAl-j0ZVJClX17HRGc-l6JplABN9Vy-H8-0A4C4FIMRYDwSh6BwAAzUoAApSN-SEABV0DAABKUg6WCfUwG-DiKKg2A2yRTtxCkWxJFPf1ejPXpHRMV0j04WR6BkWQtGUeRGjnWdiKE9jyLoICJOo2j6KY1jzK4nj+MEytHPEjlJN3REO0TLtNLkTEFCMQVui0dTBnaG0tO0Do3AuQxXEBJdXJIegsEIHAIGbABlHA0CYI1QIgEgwDXVJCAAazK2B8sKuACmNWIwCSABBKI8C2KTfIPJMZFUextEcTgLhGVoPlHWxZUVNV1GnVwZlGUzKwyrLcrqorSBatZWUK-BGK2NB6FqgqisavBmrajquq5Hy4KTFNhvoDNJDQlw5p0foNJsOxVDUua3BuWZlrSnBmRagg6ByldgioMAAEcMBQFI0DAYg8FA7r7v8vM7WemxrlxAF3hvGxTw+i5RkS3N1BByIwdgCHcphiI4cR5GwFR9HMe8+NeT82Sj0dDF5IMqdzgMr4bx0Z6ATkdxflUC46foJJfxrKGWYZEriDK6sKuq46teIKh1Za9rOrKW6+YtQW5G0i8mmdGZEsnIk1KUB5dCcHoH1+FW1eIDWoGh4Nlm26E9rwA6kiO1KTbNq7Lax-nev8+WdI8EbAaGqkiUI15unRJVS1zWRHF8JdiEIA14EqeO91T+C+zTNDnT7OdqSldpFCMH4O6fKdlBV6ta3rJs6Eb236mPbThsIlwxYudRCQ0ywATvEZRl0LpBWdEeICNKeZPqFxtJXwzcXkfQZy6HM-XsfQFdGa+b5V9zLMouubZPgULiUeU188xaAnFLb63R6BAL0uXJ8TQZwq1WtlKGG04DHwFjPeUCkfRoWvtcIwUp0SDVsFOG4ypZx+jmClY2DFwZJEhiHY2bMkYozRhjNBadBZaCpEFKk2J3heBcESRKzRzgXD6JMXMRcA7q2ZmHGS0l0FyRTLKFeuhb5zgJPnCcOlhrIWGr0PMtNK5AA */
  id: 'simulation',
  context: ({ input, self, spawn }) => ({
    dateRangeRef: spawn('dateRangeMachine', {
      id: 'dateRange',
      input: {
        parentRef: self,
      },
    }),
    previewDocsFilter: 'outcome_filter_all',
    previewDocuments: [],
    processors: input.processors,
    samples: [],
    samplingCondition: composeSamplingCondition(input.processors),
    streamName: input.streamName,
  }),
  initial: 'initializing',
  on: {
    'dateRange.update': '.loadingSamples',
    'simulation.changePreviewDocsFilter': {
      actions: [
        { type: 'storePreviewDocsFilter', params: ({ event }) => event },
        { type: 'derivePreviewDocuments' },
      ],
    },
    'simulation.reset': {
      target: '.idle',
      actions: [{ type: 'resetSimulation' }, { type: 'derivePreviewDocuments' }],
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
      { actions: raise({ type: 'simulation.reset' }) },
    ],
  },
  states: {
    initializing: {
      always: [
        {
          guard: {
            type: 'hasProcessors',
            params: ({ context }) => ({ processors: context.processors }),
          },
          target: 'loadingSamples',
        },
        { target: 'idle' },
      ],
    },

    idle: {},

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
          streamName: context.streamName,
          absoluteTimeRange: context.dateRangeRef.getSnapshot().context.absoluteTimeRange,
        }),
        onDone: {
          target: 'assertingSimulationRequirements',
          actions: [
            { type: 'storeSamples', params: ({ event }) => ({ samples: event.output }) },
            { type: 'derivePreviewDocuments' },
          ],
        },
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
          documents: context.samples,
          processors: context.processors,
        }),
        onDone: {
          target: 'idle',
          actions: [
            { type: 'storeSimulation', params: ({ event }) => ({ simulation: event.output }) },
            { type: 'derivePreviewDocuments' },
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
}: SimulationMachineDeps): MachineImplementationsFrom<typeof simulationMachine> => ({
  actors: {
    fetchSamples: createSamplesFetchActor({ streamsRepositoryClient }),
    runSimulation: createSimulationRunnerActor({ streamsRepositoryClient }),
    dateRangeMachine: dateRangeMachine.provide(createDateRangeMachineImplementations({ data })),
  },
  actions: {
    notifySamplesFetchFailure: createSamplesFetchFailureNofitier({ toasts }),
    notifySimulationRunFailure: createSimulationRunFailureNofitier({ toasts }),
  },
});

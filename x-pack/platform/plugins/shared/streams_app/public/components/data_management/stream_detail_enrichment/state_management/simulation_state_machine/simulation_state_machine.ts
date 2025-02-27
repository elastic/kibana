/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, MachineImplementationsFrom, and, assign, sendTo, setup } from 'xstate5';
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
import { derivePreviewColumns, filterSimulationDocuments, composeSamplingCondition } from './utils';

export type SimulationActorRef = ActorRefFrom<typeof simulationMachine>;

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
    storeProcessors: assign((_, params: { processors: ProcessorDefinitionWithUIAttributes[] }) => ({
      processors: params.processors,
    })),
    storeSamples: assign((_, params: { samples: FlattenRecord[] }) => ({
      samples: params.samples,
    })),
    storeSimulation: assign((_, params: { simulation: Simulation }) => ({
      simulation: params.simulation,
    })),
    derivePreviewColumns: assign(
      ({ context }, params: { processors: ProcessorDefinitionWithUIAttributes[] }) => ({
        previewColumns: derivePreviewColumns(context, params.processors),
      })
    ),
    derivePreviewConfig: assign(({ context }) => {
      return {
        previewColumns: derivePreviewColumns(context, context.processors),
        previewDocuments: context.simulation
          ? filterSimulationDocuments(context.simulation.documents, context.previewDocsFilter)
          : context.samples,
      };
    }),
    deriveSamplingCondition: assign(({ context }) => ({
      samplingCondition: composeSamplingCondition(context.processors),
    })),
    emitSimulationChange: sendTo(({ context }) => context.parentRef, { type: 'simulation.change' }),
  },
  delays: {
    debounceTime: 800,
  },
  guards: {
    canRunSimulation: and(['hasSamples', 'hasProcessors', 'hasValidProcessors']),
    hasProcessors: ({ context }) => !isEmpty(context.processors),
    hasSamples: ({ context }) => !isEmpty(context.samples),
    hasValidProcessors: ({ context }) =>
      context.processors
        .map(processorConverter.toAPIDefinition)
        .every((processor) => isSchema(processorDefinitionSchema, processor)),
    shouldRefetchSamples: ({ context }) =>
      Boolean(
        context.samplingCondition &&
          !isEqual(context.samplingCondition, composeSamplingCondition(context.processors))
      ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAKwB2ADQgAnogCMANgCc9AEycAzMuWdlAFmWTdqgL6X5qTLmFk72fEWL0AxgAtaMAAoATmAAbihgAO4AIoQesABiKFhsAVy8SCACQm6iEggGWlr0xqqc6mXqehbGWvJKCKqq0vRGkpIAHG3qutKSqrrG1rboLo6kTAExcLCEAbCePnQcPKKZKI45UnKKiNWS9GaqWuacbcoWBZKDIM4ObvQoxGsoOFgoAF4PUKSpK4JPIulcqpjJx6NJVK1wcpwRVpOpaiotE1JJxUSc2tI9H1pMorjdXCR7o8CC93p9vso0vw-utAYhgaDwZDVNCNJw4QiEKciuVTlpDpwtGY2njhrdCRAwAAjQgYYgeT4AYQWMFgYwmHimMzm3l8SypGRp2TpCH5xjBEJZqjaMjZ5k5Wk69HUx3UEM4xlMul0ovsBPckplcoVdGVerVYlgeEo9BwADNkgAKQOy+VgAAq6DAAEpSPjHPQU8GlSq4D90qtaaAgSCLczWbD4dsEJ7QW6WazUdCjL6Rnci-KS+HSJHo2xYwmwAFk9LU5rM2gc3mxf7C7Pi6HS7B2JTflkAdX6bWmbaG+ym3VzObTF09NIQeotLotL3xe4sIQcBBPgBlHBoJgsDgcgSDAIlgkIABrMD8zuD8v1-f9ALgBAHggjx-VSctqX3YgNjyC56E6ThJGMUiXTUN0HR6ehgWfGR1GUCoMXUV9V3g786D-ACgLVKcJgCehAPwOMZjQehYMJDjEJ4lC0JiTCeGww1cPw5RCOI0jyMkSjVE5AxNHKMoUQaJj+UuGxrhXAscFgWApwILjrLcKgwAARwwFAgkXYg8DVZTK2NQ88h6TRHQMXRGOKUp7WbfRdFouEcV5LQ3RdNibLshzf2ckhXI8rywB8vyKQNQKD3EFRQu0U4ziikoXV0Tl2k0FoNBBdSjhkDK7gCOVHicv1RggUDwKgmDcvcPriAGqAf0m1DiHQxTuACo0KtyIU2gSloZF0HT1JtNpOQsTQDiOe8zGMHp9p6wlptm+ahrcUh+JmISHFEgJxMkqb+py56SEW5bHCw5YK3WvCTS2nazD2g7HXaai9kxXR2XU+9pAKF8rmIQhJXgdJfr3f4oeCi9EAAWlUZo0Tp+mTDu9wHieUkPjoEmq0qlskXofazChN1SmhTk2hptQGkxNotGqe9iiZ+4ICAzmgu5mXeYayKSOfTFjGO5tUqaRo3WkOFpYKMwFYHEMoDDRZCZw0n8P20F9BlzoZa6Npii2Opik0faveBR1Dm9iyhkB99P04uakN4lWNpUIxXelnpMaRExJH04ptD0QUTjMfpUQGSzftjLKAkcubJvyzzvLAXyHZUp2TUzgP1G2nSMTF4wTuUNo+eKfpnyYvR+QVh6Ab7CryrJ7mmMaehSON4w0dKdRqgdDoilSiFau9DeRWsSwgA */
  id: 'simulation',
  context: ({ input, self, spawn }) => ({
    parentRef: input.parentRef,
    dateRangeRef: spawn('dateRangeMachine', {
      id: 'dateRange',
      input: {
        parentRef: self,
      },
    }),
    previewColumns: [],
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
        { type: 'derivePreviewConfig' },
      ],
    },
    'processors.change': {
      target: '.debouncingChanges',
      actions: [
        { type: 'storeProcessors', params: ({ event }) => event },
        { type: 'derivePreviewColumns', params: ({ event }) => event },
      ],
    },
  },
  states: {
    initializing: {
      always: [
        {
          guard: 'hasProcessors',
          target: 'loadingSamples',
        },
        { target: 'idle' },
      ],
    },
    idle: {},
    debouncingChanges: {
      on: {
        'processors.change': {
          target: 'debouncingChanges',
          actions: [
            { type: 'storeProcessors', params: ({ event }) => event },
            { type: 'derivePreviewColumns', params: ({ event }) => event },
          ],
          description: 'Re-enter debouncing state and reinitialize the delayed processing.',
          reenter: true,
        },
      },
      after: {
        debounceTime: [
          {
            guard: { type: 'shouldRefetchSamples' },
            actions: [{ type: 'deriveSamplingCondition' }],
            target: 'loadingSamples',
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
            { type: 'derivePreviewConfig' },
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
          guard: 'canRunSimulation',
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
            { type: 'derivePreviewConfig' },
            { type: 'emitSimulationChange' },
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

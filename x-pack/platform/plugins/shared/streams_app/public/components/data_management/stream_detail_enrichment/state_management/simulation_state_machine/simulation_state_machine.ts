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
  and,
  assign,
  sendTo,
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
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAIwB2AGwAWetICsnTgA5Js2cuUBOZQCYANCACeiALSTOh+rfUBmWdL3TpzzkYC+306kxcYTIA7HwiYnoAYwALWhgABQAnMAA3FDAAdwARQijYADEULDYkrl4kEAEhCNEJBGU5ej1HLWlOaXUveXVlUwsES0d5TnpHPV7DdVk3I07ff3Qw4NImJLy4WEIk2Gi4ug4eUWqUYLrETTtHR3V3fUlnWRl+q2VZenV5RoVpEcNO+TSBYgUJBCL0FDEU4oHBYFAAL0hUFI5WOgmhIkq9QeN3o8gmknk8kMhi0JNkLwQWnosl6sk4eimegUxL0wNB4RIEKhBFhCKRKMkFX46LOWKkjmUkg+7i8XhsjL08kpLiUCq8ei0LUkhnk7KWYK5EDAACNCBhiFEkQBhfYwWCrdZRTbbXaxeKHYVVUW1cUIemOehacZ6Nw6zjE5XmRAk6WSB662mSRmcWSOQz6wKcyLGs0Wq10W0eh1iWB4Sj0HAAM1KAApc+bLWAACroMAASlIHOC9Ab+ZtdrgqMqJzFoGxnHGYychm0yklKgZlK00payk+jncpJkQL8IIN2d7psbBagRYOJbLFerdb7TdbaA7XYPPbvp-P9vYQrRNUx46kHTvNoXxTJoUqyCY0YILO6j2No2iGGG6auLImbLOCWCEDgEBIgAyjgaBMFgcDkCQYDcqkhAANbkbABFEXABRgHgsRgEkACCUR4Nsw4ir+xDnFSi5wWmnA4i06aOMutj0Ko8jpl0bhrkqaGGpEmHYXh9HEQ6bHrEk9BEfgVbbGg9B0YROlMSxMRsZx3FlEcI4+n+4gxpOoy6pqzIuF0OjqNJdhyQpDKuJKKl7t24I4LAsBsQQdC4S+ERUGAACOGAoCkj7EHgDq8d6-GCYSrT0KSHTjDq0wkiqNgfH5DxKv80iSOoqmHjFcVJAlUBJVmwSpRlWVgDleWCl6o6+v+VLyaMtiSMo8j0qSi2tSqOhldMcjuD0qgPO1PZJBaUKJclJCkcQ5GQpRNHmWdxBUMddlcTxTl8RiAl+nI7yqKojgVXMbyUvJdidCo66SuMEZtZF930EdxAnb192kHp2yGUEJlJGZUUkI9iPPQ5BWTa59TbUGHhiUp2ghpS67SEGi0Rjo7jBr4e7EIQxrwJUuOfe9Y5uQ0uhBmmoZhoYEa6pS1jqHoslTJuDJfDY8gyAd4KQtCfKInQP4fcVkrvP964uItTw3FGAyWNMaohl8uitV0u6LP1msQMR+uC-ULjvJ8gI6l8oaGFKlK-IoGo7UqDuhhrRrHv2haDjzAtTULmiBnInxSmrtJSgFUHxsoeLgcGmoBoycfqVhOGJdpcBe2n2JJmVwzjAojTjEYMsjHBtj0i0MxTESeqw27XKdfFeH3YNmXZWAuUp4VBt+lq8vaOL0gkpLbzSJS-yBtum5dJuLULaPrvoVyCNI31V-88v3sAZLsnZ-oIdyy4VuIOuxcPKmFVJwtR6OzbwQA */
  id: 'simulation',
  context: ({ input, self, spawn }) => ({
    parentRef: input.parentRef,
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
    'processors.change': {
      target: '.debouncingChanges',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
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
          actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
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
            { type: 'derivePreviewDocuments' },
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

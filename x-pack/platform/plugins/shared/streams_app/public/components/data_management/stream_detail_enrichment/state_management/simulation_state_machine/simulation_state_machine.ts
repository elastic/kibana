/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom, assign, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  FlattenRecord,
  SampleDocument,
  isSchema,
  processorDefinitionSchema,
} from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';
import {
  SimulationInput,
  SimulationContext,
  SimulationEvent,
  Simulation,
  SimulationMachineDeps,
} from './types';
import { PreviewDocsFilterOption } from './simulation_documents_search';
import {
  createSimulationRunnerActor,
  createSimulationRunFailureNofitier,
} from './simulation_runner_actor';
import { getSchemaFieldsFromSimulation, mapField, unmapField } from './utils';
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
    runSimulation: getPlaceholderFor(createSimulationRunnerActor),
  },
  actions: {
    notifySimulationRunFailure: getPlaceholderFor(createSimulationRunFailureNofitier),
    storePreviewDocsFilter: assign((_, params: { filter: PreviewDocsFilterOption }) => ({
      previewDocsFilter: params.filter,
    })),
    storeProcessors: assign((_, params: ProcessorEventParams) => ({
      processors: params.processors,
    })),
    storeSamples: assign((_, params: { samples: SampleDocument[] }) => ({
      samples: params.samples,
    })),
    storeSimulation: assign((_, params: { simulation: Simulation | undefined }) => ({
      simulation: params.simulation,
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
    resetSimulationOutcome: assign({
      simulation: undefined,
      detectedSchemaFields: [],
      previewDocsFilter: 'outcome_filter_all',
    }),
    resetProcessors: assign({ processors: [] }),
    resetSamples: assign({ samples: [] }),
  },
  delays: {
    debounceTime: 800,
  },
  guards: {
    canSimulate: ({ context }, params: ProcessorEventParams) =>
      hasSamples(context.samples) && hasValidProcessors(params.processors),
    hasProcessors: (_, params: ProcessorEventParams) => !isEmpty(params.processors),
    '!hasSamples': (_, params: { samples: SampleDocument[] }) => !hasSamples(params.samples),
    hasValidProcessors: (_, params: ProcessorEventParams) => hasValidProcessors(params.processors),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AG0AG0VCcKoCJPiAAeiAIwB2AGwAWetICsnTgA5Js2cuUBOZQCYANCACeiALSTOh+rfUBmWdL3TpzzkYC+306kxcYTIA7HwiYnoAYwALWhgABQAnMAA3FDAAdwARQijYADEULDYkrl4kEAEhCNEJBAU7Rz09WUdOR0NDSU7TCwRLWVb6WSd5bXlDTj15aUNff3Qw4NJQoIjouLowAGUwHCTYhIOcNFhy0WqUYLrEQ1dJJVnZKacbPXu+q3kvej1HSRuOZ6SSAzQLEBrcIkVZLdYkegpWBgPAXSpXG6VeqGWZ6eiSdQzTiSbqtEHSL4DQzqeidVz3VzSeQzeTKRwQqErJhJPJwWCEJKwegAKjR-EE11qWKk6gUtPkJOU6ll+n08kplkMykenFZ6i6Ctkknk6mUHLh0LI3N5sH5SWitCiYCwYqqEsxoGxPWUfyVL0Msl1LnV5isNOUP1as1mOKMunNgUtpGtTttAs28Q4PEu7qlnsQyrxnRaOMkSr0Gg1zXobNG0iD-wDnQTywiyZ5qbt9AgzpRWYq4pqImlCC6cpNOm6gfrEcpNkULiNhI6XWpGhb8KtHb56Z7WD77EkA7dQ+It1H7Ts8gVpIeEcclOvdkX8jprNmc1kG8t9BQEH3sKJsE9AAGYZFgEBCmgOBMK6GJ5uIBaBvKswkqyJbapSQx2B43TSGW7haOyfiQhawF-gBnIbGBzqQYwxDQbB2bormw75ggsqcCh+GxhhkiUuoxK0jYhitMohFtN+wE9gARoQGDEFEKB0AAwlsMCwO2NpdrEmZwaxZ4jsy0h-K0nBMnohJDPxoYDI4ii6tM1L-PWjh+lJGyyfJinKVAamZppYiwHglD0DgIGlAAFF5ClOgAKugYAAJSAa2CIxT5qnqXA+mnueImPOokyONI6juCVr4mLZNiyPichaBG9ZWdSHnpWAcmxb5-nbIFwWheFUUZfFiUpVRbUdZlfnZecR45nlI42HIIwKEYyplloVX9AGNKcNo2iifhdKtK1kRYIQOAQL5OynEw+6aWASQ8vat34CBApoPQsA3XdBQorED0AIJRHgAq5ZKbGIaOxI0mWOgKDMeEhv0Ik1rqnSCW4-xqidYW2g9BB0DsZERFQYAAI4YCgKRoGAxB4JpYMepDxoAvQ3Tmc0JKyl0WE2PQyq7T0COEeoOM4HjSQE1ARNAST5OU9TtP06Qh7HvBEP1CzXG2GW4w6xGBJYTobOynI7gmqoPQ40kCnEFdxMwhAJBgL+xCpIQADWLtjcQVC24DwOg8xg7g4Z7FyLVqiqO0HhGCosiPp0ShlboThshWJrW7b9uyzCD1PfQL14G9SQfT7fvEMQAcg2UwcnqH55m3V7SAq42jNHolJKiZutBuJ+GSRCxCED28CVD7c0N0ZzKmdOzJWSCGq6Hir5goSarmfIOMUWAk9M-Ui789ePHoR8mG2UyDn6ObLLL3oONDV1017wh9SaI4SijKyxpaKahvVWWeg38jRtBBIGZo8wSI+3oGdC6V1vpwBfhrKQoxHiGHss0FaHgDCbW+NrQMAZpjOA+EVa8YsJZSxlmlX28sqZgBpnTMeId94oJaMtFobhVxeBcJSe4H9ug9FKh0Qiuss6VxztQpBYdma2C4kqVk+gtRWSZF3U0+J2jTnaCVY0otfDeCAA */
  id: 'simulation',
  context: ({ input }) => ({
    detectedSchemaFields: [],
    previewDocsFilter: 'outcome_filter_all',
    previewDocuments: [],
    processors: input.processors,
    samples: [],
    streamName: input.streamName,
  }),
  initial: 'idle',
  on: {
    'simulation.changePreviewDocsFilter': {
      actions: [{ type: 'storePreviewDocsFilter', params: ({ event }) => event }],
    },
    'simulation.reset': {
      target: '.idle',
      actions: [{ type: 'resetSimulationOutcome' }, { type: 'resetProcessors' }],
    },
    'simulation.receive_samples': [
      {
        guard: { type: '!hasSamples', params: ({ event }) => event },
        target: '.idle',
        actions: [{ type: 'resetSimulationOutcome' }, { type: 'resetSamples' }],
      },
      {
        guard: {
          type: 'hasProcessors',
          params: ({ context }) => ({ processors: context.processors }),
        },
        target: '.assertingSimulationRequirements',
        actions: [{ type: 'storeSamples', params: ({ event }) => event }],
      },
      {
        target: '.idle',
        actions: [{ type: 'storeSamples', params: ({ event }) => event }],
      },
    ],
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
        actions: [{ type: 'resetSimulationOutcome' }, { type: 'resetProcessors' }],
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
        debounceTime: [{ target: 'assertingSimulationRequirements' }],
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
  streamsRepositoryClient,
  toasts,
}: SimulationMachineDeps): MachineImplementationsFrom<typeof simulationMachine> => ({
  actors: {
    runSimulation: createSimulationRunnerActor({ streamsRepositoryClient }),
  },
  actions: {
    notifySimulationRunFailure: createSimulationRunFailureNofitier({ toasts }),
  },
});

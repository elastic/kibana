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
import {
  filterSimulationDocuments,
  composeSamplingCondition,
  getSchemaFieldsFromSimulation,
  mapField,
  unmapField,
} from './utils';
import { MappedSchemaField } from '../../../schema_editor/types';

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
    notifySimulationChange: sendTo(({ context }) => context.parentRef, {
      type: 'simulation.change',
    }),
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
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAIwB2AGwAWetICsnTgA5Js2cuUBOZQCYANCACeiALSTOh+rfUBmWdL3TpzzkYC+306kxcYTJYPAAnMBw0AFFiMJQAYwALNDBiPHpk2hgABQiANxQwAHcAEUIE2AAxFCw2MK5eJBABISJiUQsEa3U9eiMnFzcPWS8TcURDeRt6R0ktPW1pdU5tX390bHx20lCIqNj45NT0+iYwirhYQjDYTKTsjh5RVpRg0QkEWUc7KeV5wxGZTSQyGaSmLrWPSOWacdzqMHyBTqdyydYgAJbYL0FDEN4oHBYFAAL1xUFIjRegnxIman0kjkc6no8j0mnk8lBWlBsghUlk9Fk6mUoz0hl6Ck5enRmKC7RxeIIhJJZIpkia-Gp7zpUkc-3oKOkXi8NjFenkfK+0iUpq8egWcymMs2cpIOIgWDAu3CkRicUSKTSGQAZkUsBA7mgcExKc1XtrQJ91LJJEpOKy1H9nJILeZEJoYWbOen1E5HObnYFtm6UB6vXtfYcAycQ2GI4xiFGY8841r2h9EPI4f0PPMJXDNFNLQX6EXDCWy2LK1j5RAwAAjQgYYgJMkAYQedDg3v2fqOgdO50usGut3uj1jmratMT+f1aiFoxzwvU8nUlssI0lEZP89E4RxVlkPQ3GXV1iHoNdN23Xc6APR5YFIMRQkoegcGDeoAApEK3HcwAAFXQMAAEpdhdat4OI5D90PGBYEfFo+xfCYEBsYd5GkSRdHkZQVhUFNLS0a0f3kH4dEZZRHFg+iEI3EiUKgNCjwwrC8BwvDCMY0iKNSGjZWUwz1M01j2HVKlnw6HUeNWa02QUCDs0MblLURG0GXZNwdBzJTsSwQgcAgMkAGUoiYT0MIgEgwAVfJCAAayS2AYriqowDwZIwDCABBBI8Budj437RyZFUextAghly0ZQxHAk2x+nTH4VjcaF9HkYL5VC8Koqy48CouMIziCYMbjQehMrQWK4ByvKkgK4rSoaHsnxpBzXwQecIPoKZ7UWFwVh0f88ycuxVBk8VOG6vUKz8DE6OxHAbwKgg6Eit72ioMAAEcMBQCIWww8rON27iczmI6bA8e1xVkUFLRTTgDXOhlzTBAT1H6t0PtgL6or+kgAeB0GwHBtUNQ4+yBx4mSMdsQSkVZ5RpkurptGUI7kzkdw-1UBkCfgsJtzxH6ybIBLiCS3EUvSuaZaoSW1pKsqtvpnbGbkPmFBFUsjTFWTLSHGFWVUdxxWTP9JDF+gJeIKWoF+qtglIMabkm-BprCWazOCNWXY1jbIYZxzBfoGR6u6uroMtETrTZ9MdHcLRFPRYhCDXeBmiDyrtoTbinpHOZJHHZZJCnK7LHug04Rt1k9Qe6RHdxfFlVJOg7N1qq9QFCCRJcTmUyZXNIWTG1y3NXR-lLOEO7rPuS8+FwBV-fia+E6DAUkS1pA5ex9CF81hP0aUXsLt0LOY9DV6L7iZzkX9-mmIUF4kwSWX+FNvntKMcshhHaDQij9Ea+di5P3pEKVMzUZKLGEojIwAEhy1VsKKZwYot59WvjLXCn0wjfTdqrIGIMwZBigTrNe-JoKCigtBEEoIvAuG8h4eGDJljgQzmzR2ztXbuxXFxCqXF6S2AxiJC+YoRKLCPknYUMcIKjA8Dw78vhfBAA */
  id: 'simulation',
  context: ({ input, self, spawn }) => ({
    parentRef: input.parentRef,
    dateRangeRef: spawn('dateRangeMachine', {
      id: 'dateRange',
      input: {
        parentRef: self,
      },
    }),
    detectedSchemaFields: [],
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
    'streamEnrichment.changePreviewDocsFilter': {
      actions: [
        { type: 'storePreviewDocsFilter', params: ({ event }) => event },
        { type: 'derivePreviewDocuments' },
      ],
    },
    'streamEnrichment.processors.change': {
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

    idle: {
      on: {
        'streamEnrichment.fields.map': {
          actions: [{ type: 'mapField', params: ({ event }) => event }],
        },
        'streamEnrichment.fields.unmap': {
          actions: [{ type: 'unmapField', params: ({ event }) => event }],
        },
      },
    },

    debouncingChanges: {
      on: {
        'streamEnrichment.processors.change': {
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
            { type: 'deriveDetectedSchemaFields' },
            { type: 'notifySimulationChange' },
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

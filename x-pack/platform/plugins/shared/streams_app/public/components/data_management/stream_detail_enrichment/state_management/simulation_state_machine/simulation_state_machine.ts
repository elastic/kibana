/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom, assign, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { FlattenRecord, isSchema, processorDefinitionSchema } from '@kbn/streams-schema';
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
  SampleDocumentWithUIAttributes,
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

const hasSamples = (samples: SampleDocumentWithUIAttributes[]) => !isEmpty(samples);

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
    storeSamples: assign((_, params: { samples: SampleDocumentWithUIAttributes[] }) => ({
      samples: params.samples,
    })),
    storeSimulation: assign((_, params: { simulation: Simulation | undefined }) => ({
      simulation: params.simulation,
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
    storePreviewColumnsOrder: assign(({ context }, params: { columns: string[] }) => ({
      previewColumnsOrder: params.columns,
    })),
    storePreviewColumnsSorting: assign(
      (_, params: { sorting: SimulationContext['previewColumnsSorting'] }) => ({
        previewColumnsSorting: params.sorting,
      })
    ),
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
      processors: [],
      detectedSchemaFields: [],
      explicitlyEnabledPreviewColumns: [],
      explicitlyDisabledPreviewColumns: [],
      previewColumnsOrder: [],
      simulation: undefined,
      previewDocsFilter: 'outcome_filter_all',
    }),
    resetProcessors: assign({ processors: [] }),
    resetSamples: assign({ samples: [] }),
  },
  delays: {
    processorChangeDebounceTime: 800,
  },
  guards: {
    canSimulate: ({ context }) =>
      hasSamples(context.samples) && hasValidProcessors(context.processors),
    hasProcessors: (_, params: ProcessorEventParams) => !isEmpty(params.processors),
    '!hasSamples': (_, params: { samples: SampleDocumentWithUIAttributes[] }) =>
      !hasSamples(params.samples),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYlU1wJIDoBjACx2JgAUAnMANxTAHcAIoTqwAYiix4w7ANoAGALqJQAB0KpqxZSAAeiAGwBmOTQDsAJnP65AFnMAOAIw2598wBoQAT0SOArFY09vqmjmGGNvZy+vY2AL5xnhTY+ERkyVRpNJywYHjySkggahpp2noIALSWNEYAnHX2fnX6djHRNp4+CI76zjRycobNFo729sOmCUnoKZrks5m0nHRgKFxgAPqwOGgqWHAF2iUomuWI1ea1hg1NLW1RrV2+poamNC6N5n5+hs4u8USIAyqRIC0ooOI2TAq3WWx2ewOsBkjkKqnUpzKRQqfhs7zq5j+hn0dUihkM5kczwQrT8NEsch++gC9xsfmmwMWkPBcyyKzWG22u32h3MaOKGLO2IuNXqjWarSsj063l8wRMTmsv1iAICHJB8xU7GEcFghHYsBoACojkUTlLQBVLtdbgqHh1qc5KQM6q9hrZzHi7PquYbjatYGb2PRmKssLb0aUSOcqrKbvL7kqPaqen5HO8frY-NFHHI6sNDCGIWGTZHzfQmCwwAmJUmtNKqnZHEFTAFHFZGhEbL7qTZ+pZ9MzYsFxvpzFXeWCjbWozQIGADlIW-asY6LjcbDRjKXeuY6qWKXVqbT6eZGYr7HVi8GgQa0qRlxHV+vN83UcdJV3XQZSuOU7kVdonhzRwn3eAd-EMR9zFMYJ9AXJYoRQCADh5DCaAAM14LAIEtNAcBUbdAOTDtBwGQkbGJQkjG+a8JmuRlA0aYcbnsdDIRoLCcLfWhCI3EiaAwYgyIoxQALbFNaLkejGOJCk-GpFCTFcYl7FCfsfgaPjNDXMAACNCEkugUBYABhRsYFgUgdFgPB8DAGgcHwqR2AACk-U1zTs5gYAEMyLOIVYABV0DAABKXD+PXczLOsqAgqbZFZLtKj2z3BBFOUudVJY6CbneG5GV6Nw3jeKZX1DLIcEjaQCBYAAlMAAEcMBQTg0DAYg8Ecyj5I7UsGnpCJkMiX0YLnT1-HeGJTBsGwjCGH5AyMxrmvYVqoA67rerAfrBuG-9stGvKwjCGgfjW4YGKUlDDGvN52NxRDkIJX1tuWSTiFSgBlBqwQgEh3OsrhCAAa3c4TiDagHpAAQToPBzRGzFqLy4d7BoMYVvLZDhhHHN7jMJw7y9AldLqP6oXYAHgdBshpGNaN9nwfDzTQGgEaR4hiFR9HMayxNsdy4CEDxgndO4kmRmpXTuwpR4KUGUlCQSIFiEIdd4CKBG5MllNKjWuoez7AcJlWsnunzcqLFGKx82sAkGYE7CwBNh1paMfG5DGVxTDqaIzz+akrEPXTkOD30-GZJ9PaS8KrNs+y4F9oCKiKmgw4JSdVv8RxhmpAI6WZIY7HJL6+k9prcj21LDp6vqBqG7Ocel893jkImmn7sc8XscviXz5xGVMUwy0QtlPaZoWWerICd27iown0AZcRJBik7ZUecyQj4z2YomZ7LHW4iAA */
  id: 'simulation',
  context: ({ input }) => ({
    detectedSchemaFields: [],
    previewDocsFilter: 'outcome_filter_all',
    previewDocuments: [],
    explicitlyDisabledPreviewColumns: [],
    explicitlyEnabledPreviewColumns: [],
    previewColumnsOrder: [],
    previewColumnsSorting: { fieldName: undefined, direction: 'asc' },
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
        target: '.assertingRequirements',
        actions: [{ type: 'storeSamples', params: ({ event }) => event }],
      },
      {
        target: '.idle',
        actions: [{ type: 'storeSamples', params: ({ event }) => event }],
      },
    ],
    'previewColumns.updateExplicitlyEnabledColumns': {
      actions: [
        {
          type: 'storeExplicitlyEnabledPreviewColumns',
          params: ({ event }) => event,
        },
      ],
      target: '.idle',
    },
    'previewColumns.updateExplicitlyDisabledColumns': {
      actions: [
        {
          type: 'storeExplicitlyDisabledPreviewColumns',
          params: ({ event }) => event,
        },
      ],
      target: '.idle',
    },
    'previewColumns.order': {
      actions: [
        {
          type: 'storePreviewColumnsOrder',
          params: ({ event }) => event,
        },
      ],
      target: '.idle',
    },
    'previewColumns.setSorting': {
      actions: [
        {
          type: 'storePreviewColumnsSorting',
          params: ({ event }) => event,
        },
      ],
      target: '.idle',
    },
    // Handle adding/reordering processors
    'processors.*': {
      target: '.assertingRequirements',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.cancel': {
      target: '.assertingRequirements',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.edit': {
      target: '.assertingRequirements',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.save': {
      target: '.assertingRequirements',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.change': {
      target: '.debouncingChanges',
      reenter: true,
      description: 'Re-enter debouncing state and reinitialize the delayed processing.',
      actions: [{ type: 'storeProcessors', params: ({ event }) => event }],
    },
    'processor.delete': [
      {
        guard: {
          type: 'hasProcessors',
          params: ({ event }) => ({ processors: event.processors }),
        },
        target: '.assertingRequirements',
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
          target: 'assertingRequirements',
          actions: [{ type: 'mapField', params: ({ event }) => event }],
        },
        'simulation.fields.unmap': {
          target: 'assertingRequirements',
          actions: [{ type: 'unmapField', params: ({ event }) => event }],
        },
      },
    },

    debouncingChanges: {
      after: {
        processorChangeDebounceTime: 'assertingRequirements',
      },
    },

    assertingRequirements: {
      always: [{ guard: 'canSimulate', target: 'runningSimulation' }, { target: 'idle' }],
    },

    runningSimulation: {
      invoke: {
        id: 'simulationRunnerActor',
        src: 'runSimulation',
        input: ({ context }) => ({
          streamName: context.streamName,
          documents: context.samples
            .map((doc) => doc.document)
            .map(flattenObjectNestedLast) as FlattenRecord[],
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

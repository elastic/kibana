/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ActorRef,
  ErrorActorEvent,
  MachineImplementationsFrom,
  Snapshot,
  and,
  assign,
  fromPromise,
  not,
  sendTo,
  setup,
} from 'xstate5';
import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  Condition,
  FlattenRecord,
  UnaryOperator,
  getProcessorConfig,
  isSchema,
  processorDefinitionSchema,
} from '@kbn/streams-schema';
import { APIReturnType, StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { errors as esErrors } from '@elastic/elasticsearch';
import { isEmpty, isEqual, uniq, uniqBy } from 'lodash';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DetectedField, ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';

export interface TableColumn {
  name: string;
  origin: 'processor' | 'detected';
}

export const previewDocsFilterOptions = {
  outcome_filter_all: {
    id: 'outcome_filter_all',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.all',
      { defaultMessage: 'All samples' }
    ),
  },
  outcome_filter_matched: {
    id: 'outcome_filter_matched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.matched',
      { defaultMessage: 'Matched' }
    ),
  },
  outcome_filter_unmatched: {
    id: 'outcome_filter_unmatched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.unmatched',
      { defaultMessage: 'Unmatched' }
    ),
  },
} as const;

export type PreviewDocsFilterOption = keyof typeof previewDocsFilterOptions;

export interface SimulationToParentEvent {
  type: 'simulation.change';
}

export type SimulationParentActor = ActorRef<Snapshot<unknown>, SimulationToParentEvent>;

export type Simulation = APIReturnType<'POST /api/streams/{name}/processing/_simulate'>;

export interface SimulationMachineContext {
  parentRef: SimulationParentActor;
  previewColumns: string[];
  previewDocsFilter: PreviewDocsFilterOption;
  previewDocuments: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
  samples: FlattenRecord[];
  samplingCondition?: Condition;
  simulation?: Simulation;
  streamName: string;
  timeRange: { start: number; end: number };
}

const getParentRef = ({ context }: { context: SimulationMachineContext }) => context.parentRef;

export const simulationMachine = setup({
  types: {
    input: {} as {
      parentRef: SimulationParentActor;
      processors: ProcessorDefinitionWithUIAttributes[];
      streamName: string;
    },
    context: {} as SimulationMachineContext,
    events: {} as
      | { type: 'filters.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
      | { type: 'processors.change'; processors: ProcessorDefinitionWithUIAttributes[] },
  },
  actors: {
    fetchSamples: getPlaceholderFor(createSamplesFetchActor),
    runSimulation: getPlaceholderFor(createSimulationRunnerActor),
  },
  actions: {
    notifySamplesFetchFailure: getPlaceholderFor(createSamplesFetchFailureNofitier),
    notifySimulationRunFailure: getPlaceholderFor(createSimulationRunFailureNofitier),
    storePreviewDocsFilter: assign((_, params: { filter: PreviewDocsFilterOption }) => ({
      previewDocsFilter: params.filter,
    })),
    storeProcessors: assign((_, params: { processors: ProcessorDefinitionWithUIAttributes[] }) => ({
      processors: params.processors,
    })),
    storeSamples: assign((_, params: { samples: FlattenRecord[] }) => ({
      samples: params.samples,
    })),
    storeSamplingCondition: assign(
      (_, params: { processors: ProcessorDefinitionWithUIAttributes[] }) => ({
        samplingCondition: composeSamplingCondition(params.processors),
      })
    ),
    storeSimulation: assign((_, params: { simulation: Simulation }) => ({
      simulation: params.simulation,
    })),
    derivePreviewConfig: assign(({ context }) => {
      return {
        previewColumns: getTableColumns(
          context.processors,
          context.simulation?.detected_fields ?? [],
          context.previewDocsFilter
        ),
        previewDocuments: context.simulation
          ? filterSimulationDocuments(context.simulation.documents, context.previewDocsFilter)
          : context.samples,
      };
    }),
    emitSimulationChange: sendTo(getParentRef, { type: 'simulation.change' }),
  },
  guards: {
    hasProcessors: ({ context }) => !isEmpty(context.processors),
    hasSamples: ({ context }) => !isEmpty(context.samples),
    hasValidProcessors: ({ context }) =>
      context.processors
        .map(processorConverter.toAPIDefinition)
        .every((processor) => isSchema(processorDefinitionSchema, processor)),
    hasDifferentCondition: (
      { context },
      params: { processors: ProcessorDefinitionWithUIAttributes[] }
    ) =>
      Boolean(
        context.samplingCondition &&
          !isEqual(context.samplingCondition, composeSamplingCondition(params.processors))
      ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AOhWJQJyxQC8KoBiAbQAYBdRUAB0NQIluIAB6IATAGY2pAGwBOeQBZZADjYBGAOzTZ4gDQgAnoiUaNpVQFZ5krWqnitbWQF9Xh1JlyCyKCFhgTDwAToQAxnCwhCGwpOEAFjjEMOxcSCB8AkTEwmIITuKkVmxaZfKaskryVpKGJggqFpI2di1KdrXunujY+DnkAUGhEVExcYnJqRrpvPxUOXmIWlaycqsaqkpKqo4u9YiSqhY7NVpK4h0atSvdIF59vqRYhDgQjADKOGg8gbBMEBIYHIxAAboQANbAh4+AYvN6fb6-OAICjg8L9EhpNLCLILIQZfKFYqlcqVaq1A4IWRaVSkcSbeyyNiSeTnDp3GGYsjw94pL4-P5MMAhMIhUi-fAAMxiaFIXKevMRgpRaIi3OxnFx818SwKWiKJTKWgqGiqNTqxkQVi2pHsq0k2msSis205vVhJFIOFgsBFBH5Hu5ACUwABHDAoEJgNBgYh4f44jJ43WExC2OlKew7cQM2yyDQGK0IY6kaqKWxWcS7Fom93ebne33+z5B3yhiNRmNxhOsGba7IE0D5eQaGSSatsbbVpwaSSWhrzqxl1Q1dSurTXKf1x4DEIYYiUQMN3wAoEg8FQ+VtvcHo9QD43kiosHq3ya2aZHWLNP6w2kk1yQtKkNEUUgK0UFl7Ckc4d09Mh90PVsTxyYVRRiCUfBlEI5QVW8kOPXdnzVDF304JM5kHXJf2JI0yTNCkF0OcQZCUFxLnEVZV3ULR3A8EBiEICA4GEPChy-Ki9QAWmZUhJAUKQ2WrWoVKpGTSDYTSWTYswaTZVRJDgxsKAWGh6EYAd8Wo4dECk+RSFAs1aRZMd51ZVQqTMcdWjUTYOjKN1+LEvwhks1MbOpNQHI2AznGZZQrE8sc5NaCoqhYyQlCMxVXj5B8kT+MKfwii4qVkV0NOcTKqpNZwsqCp8yB9P0QgDB9Go7SNo1jeN4GTb9xPyMcDIc2RWQCqdc2rJK6TYeRCkci5HTYKxsvw+9HxQ8SU2K0RbMLOSFPG5SWkyjziykNZ7GNK42OuLM+NcIA */
  id: 'simulation',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previewColumns: [],
    previewDocsFilter: 'outcome_filter_all',
    previewDocuments: [],
    processors: input.processors,
    samples: [],
    samplingCondition: composeSamplingCondition(input.processors),
    streamName: input.streamName,
    timeRange: { start: 0, end: 0 },
  }),
  initial: 'initializing',
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
    missingSamples: {
      on: {
        // 'simulation.updateTimeRange': 'loadingSamples',
        // 'simulation.refreshTimeRange': 'loadingSamples',
      },
    },
    idle: {
      on: {
        // 'simulation.updateTimeRange': 'loadingSamples',
        // 'simulation.refreshTimeRange': 'loadingSamples',
        'processors.change': [
          {
            guard: { type: 'hasDifferentCondition', params: ({ event }) => event },
            actions: [
              { type: 'storeSamplingCondition', params: ({ event }) => event },
              { type: 'storeProcessors', params: ({ event }) => event },
            ],
            target: 'loadingSamples',
          },
          {
            target: 'assertingSimulationRequirements',
            actions: [
              { type: 'storeSamplingCondition', params: ({ event }) => event },
              { type: 'storeProcessors', params: ({ event }) => event },
            ],
          },
        ],
        'filters.changePreviewDocsFilter': {
          actions: [
            { type: 'storePreviewDocsFilter', params: ({ event }) => event },
            { type: 'derivePreviewConfig' },
          ],
        },
      },
    },
    loadingSamples: {
      invoke: {
        src: 'fetchSamples',
        input: ({ context }) => ({
          condition: context.samplingCondition,
          streamName: context.streamName,
          timeRange: context.timeRange,
        }),
        onDone: {
          target: 'assertingSimulationRequirements',
          actions: [{ type: 'storeSamples', params: ({ event }) => ({ samples: event.output }) }],
        },
        onError: {
          target: 'idle',
          actions: [{ type: 'notifySamplesFetchFailure' }],
        },
      },
    },
    assertingSimulationRequirements: {
      always: [
        {
          guard: not('hasSamples'),
          target: 'missingSamples',
        },
        {
          guard: and(['hasProcessors', 'hasValidProcessors']),
          target: 'runningSimulation',
        },
        { target: 'idle' },
      ],
    },
    runningSimulation: {
      invoke: {
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
}: {
  data: DataPublicPluginStart;
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}): MachineImplementationsFrom<typeof simulationMachine> => ({
  actors: {
    fetchSamples: createSamplesFetchActor({ streamsRepositoryClient }),
    runSimulation: createSimulationRunnerActor({ streamsRepositoryClient }),
  },
  actions: {
    notifySamplesFetchFailure: createSamplesFetchFailureNofitier({ toasts }),
    notifySimulationRunFailure: createSimulationRunFailureNofitier({ toasts }),
  },
});

type SamplesFetchOutput = FlattenRecord[];
interface SamplesFetchInput {
  condition?: Condition;
  streamName: string;
  timeRange: { start?: number; end?: number };
}

function createSamplesFetchActor({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}) {
  return fromPromise<SamplesFetchOutput, SamplesFetchInput>(async ({ input, signal }) => {
    const samplesBody = await streamsRepositoryClient.fetch('POST /api/streams/{name}/_sample', {
      signal,
      params: {
        path: { name: input.streamName },
        body: {
          if: input.condition,
          start: input.timeRange.start,
          end: input.timeRange.end,
          size: 100,
        },
      },
    });

    return samplesBody.documents.map(flattenObjectNestedLast) as FlattenRecord[];
  });
}

type SimulationRunnerOutput = Simulation;
interface SimulationRunnerInput {
  streamName: string;
  documents: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
}

function createSimulationRunnerActor({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}) {
  return fromPromise<SimulationRunnerOutput, SimulationRunnerInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch('POST /api/streams/{name}/processing/_simulate', {
      signal,
      params: {
        path: { name: input.streamName },
        body: {
          documents: input.documents,
          processing: input.processors.map(processorConverter.toSimulateDefinition),
        },
      },
    });
  });
}

function createSamplesFetchFailureNofitier({ toasts }: { toasts: IToasts }) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    toasts.addError(new Error(event.error.body.message), {
      title: i18n.translate('xpack.streams.enrichment.simulation.samplesFetchError', {
        defaultMessage: 'An issue occurred retrieving samples.',
      }),
      toastMessage: event.error.body.message,
    });
  };
}

function createSimulationRunFailureNofitier({ toasts }: { toasts: IToasts }) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    toasts.addError(new Error(event.error.body.message), {
      title: i18n.translate('xpack.streams.enrichment.simulation.simulationRunError', {
        defaultMessage: 'An issue occurred running the simulation.',
      }),
      toastMessage: event.error.body.message,
    });
  };
}

const composeSamplingCondition = (
  processors: ProcessorDefinitionWithUIAttributes[]
): Condition | undefined => {
  if (isEmpty(processors)) {
    return undefined;
  }

  const uniqueFields = uniq(getSourceFields(processors));

  const conditions = uniqueFields.map((field) => ({
    field,
    operator: 'exists' as UnaryOperator,
  }));

  return { or: conditions };
};

const getSourceFields = (processors: ProcessorDefinitionWithUIAttributes[]): string[] => {
  return processors.map((processor) => getProcessorConfig(processor).field);
};

const getTableColumns = (
  processors: ProcessorDefinitionWithUIAttributes[],
  fields: DetectedField[],
  filter: PreviewDocsFilterOption
) => {
  const uniqueProcessorsFields = uniq(getSourceFields(processors));

  if (filter === 'outcome_filter_unmatched') {
    return uniqueProcessorsFields;
  }

  const uniqueDetectedFields = uniq(fields.map((field) => field.name));

  return uniq([...uniqueProcessorsFields, ...uniqueDetectedFields]);
};

const filterSimulationDocuments = (
  documents: Simulation['documents'],
  filter: PreviewDocsFilterOption
) => {
  switch (filter) {
    case 'outcome_filter_matched':
      return documents.filter((doc) => doc.status === 'parsed').map((doc) => doc.value);
    case 'outcome_filter_unmatched':
      return documents.filter((doc) => doc.status !== 'parsed').map((doc) => doc.value);
    case 'outcome_filter_all':
    default:
      return documents.map((doc) => doc.value);
  }
};

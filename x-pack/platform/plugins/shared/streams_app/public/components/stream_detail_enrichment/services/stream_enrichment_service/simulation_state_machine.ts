/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ActorRef,
  ActorRefFrom,
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
import { isEmpty, isEqual, uniq } from 'lodash';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { ALWAYS_CONDITION } from '../../../../util/condition';
import { DetectedField, ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';
import {
  DateRangeContext,
  DateRangeToParentEvent,
  createDateRangeMachineImplementations,
  dateRangeMachine,
} from './date_range_state_machine';

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

export type DateRangeChildActor = ActorRefFrom<typeof dateRangeMachine>;
export type SimulationParentActor = ActorRef<Snapshot<unknown>, SimulationToParentEvent>;

export type Simulation = APIReturnType<'POST /api/streams/{name}/processing/_simulate'>;

export interface SimulationMachineContext {
  dateRangeRef: DateRangeChildActor;
  parentRef: SimulationParentActor;
  previewColumns: string[];
  previewDocsFilter: PreviewDocsFilterOption;
  previewDocuments: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
  samples: FlattenRecord[];
  samplingCondition?: Condition;
  simulation?: Simulation;
  streamName: string;
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
      | DateRangeToParentEvent
      | { type: 'simulation.refreshSamples' }
      | { type: 'simulation.updateTimeRange'; timeRange: TimeRange }
      | { type: 'filters.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
      | { type: 'processors.change'; processors: ProcessorDefinitionWithUIAttributes[] },
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
    deriveSamplingCondition: assign(({ context }) => ({
      samplingCondition: composeSamplingCondition(context.processors),
    })),
    emitSimulationChange: sendTo(getParentRef, { type: 'simulation.change' }),
  },
  delays: {
    debounceTime: 800,
  },
  guards: {
    hasProcessors: ({ context }) => !isEmpty(context.processors),
    hasSamples: ({ context }) => !isEmpty(context.samples),
    hasValidProcessors: ({ context }) =>
      context.processors
        .map(processorConverter.toAPIDefinition)
        .every((processor) => isSchema(processorDefinitionSchema, processor)),
    hasDifferentCondition: ({ context }) =>
      Boolean(
        context.samplingCondition &&
          !isEqual(context.samplingCondition, composeSamplingCondition(context.processors))
      ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAKwB2ADQgAnogDMkzvQCMkgJwAWZRt2dlADm2cAbBYC+1+aky5hZB9nxFi9AE5gAZj9gACwBlHDQmLDguXiQQASEPUQkEGXklBAAmbW16Cx0dEwzOaWUMk1t7dDdnUl8ULDYvWHoAY0DaGAAFHwA3FDAAdwARQhbYADF6xujReJRnJMQNQ2l6SVUtSQtdSRMNE2U0xGl9emkMov1lXW1JXRNpCpBXJw9SJi9RuFhCJtb2ugcHizQTzRKxZKpRSICwaDK5TgZDSWUrSREaGx2Z5VV4kegoYhgnBYFAALwJUFIM1icwWEJhJl0Z20FhMBwyujyul0GSOCH2ynoRj0hlh0m0ylMmMqjnceIJRJJ5LoVI0MX4oLpoGSrKZ4tZ7M5dx5fL2a04Fp2+wyOkMTxecs8EDAACNCBhiC0KQBhAEwWDvT4tb6-ZptDpA9VxTXg7UqTgmZmsiW6aQlHSSvmSDSCkySC6I6Sbfa6e04x30Z1uj1eui+iMBsSwPCUeg4XyNAAUVfdnrAABV0GAAJSkB3OSuu3u1qD1wGwakahIiekIXVJtmlI3c3nQhCp9TmPRlaT59bLMuyic9ms+v1wUhNltsNsdsBebtTmsDoej8ceSdq09O8G3YNUQWXYhFjXRkN0NLkTT3W16AMLZJHWC1WQTS9qgArBCBwCAKVCcJIgDCASDAfFiB6QgAGsqP-PF8MI4iwgiOAEAJWiWkdaJF2jSDoLhE5zQtQojAuCULD5Up1CMCxSmtHZpDZHDcU8FiiLoEiOIDd9Pi8egInwXxfjQegmM0gjtKgXSyK4mjRj4ngBNpWNxCWDJRLUcSOURLJlBkvcinUC0LVubztiyRF1IrHBYFgd8CB08tnCoMAAEcMBQHw0DAYg8ADNyYxXON+T2VYzEsMwLCKMVd3SZRzjOQwNBZZQWRtDQTjiicEqSrwUrstKPAy7LcrAfLCuK8CaVKqDV32Hr6Gq5M6ssHrGsQblVk5HkeQuHZtDzPqAIG5LiNGkhxpyvKCqKqkMijdyys8iqVrW2r6q2vlFPUMxTHFdZtBOLIzrxLwPUJVKrzeCjiCo7j6MY67PCh4gYZGuGSEcniXO4EqhNXAt1Hau5motcU9j5XRlnoYxOU4ApVGOiH0ehq6cbIAzfmMpwzK8CyrO8TnYdw3Hkd45x+OBebifK0nNFufQ0WKE6NFklbdk2c4Hm2TgNFsLFiEIZ14FiKyILBN7km0PkAFpJHobJXbdt2TGlbFueoxUyQpa2tXe1MNBQwoDl2A5OH0HM+R652OTKQ3dkRbN2foNAUEStjSLgQOPOSdrYPOPJbj2bJFNkxTWrpixtG8+5pDydOUAgSJ89txAOW5M4zBzZFo5OKF0h2Z3YTpyUix2RllHTm9gLre8LaXG3FvKzqmWuZrFIMTkj0OPcNpQ-N9lhCUdB5dOtJzvSO7X97kV2F3660Exo+jxkTC1xNkQlItFLBiUWeWIRYXSGlzCWxBbqTWmkVO+wk1CJipoydCaIMgWFUn9dqax9h5jKBYREBDyggLRqLTGECNLwKWidPU6D8jlw6rTC49AkS106ucLQJRSzGyAA */
  id: 'simulation',
  context: ({ input, self, spawn }) => ({
    parentRef: input.parentRef,
    dateRangeRef: spawn('dateRangeMachine', {
      id: 'dateRangeMachine',
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
    'simulation.refreshSamples': '.loadingSamples',
    'filters.changePreviewDocsFilter': {
      actions: [
        { type: 'storePreviewDocsFilter', params: ({ event }) => event },
        { type: 'derivePreviewConfig' },
      ],
    },
    'processors.change': {
      target: '.debouncingChanges',
      actions: [
        { type: 'storeProcessors', params: ({ event }) => event },
        { type: 'derivePreviewConfig' },
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
            { type: 'derivePreviewConfig' },
          ],
          description: 'Re-enter debouncing state and reinitialize the delayed processing.',
          reenter: true,
        },
      },
      after: {
        debounceTime: [
          {
            guard: { type: 'hasDifferentCondition' },
            actions: [{ type: 'deriveSamplingCondition' }],
            target: 'loadingSamples',
          },
          {
            target: 'assertingSimulationRequirements',
            actions: [{ type: 'deriveSamplingCondition' }],
          },
        ],
      },
    },
    loadingSamples: {
      invoke: {
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
          guard: not('hasSamples'),
          target: 'idle',
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
    dateRangeMachine: dateRangeMachine.provide(createDateRangeMachineImplementations({ data })),
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
  absoluteTimeRange: DateRangeContext['absoluteTimeRange'];
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
          start: input.absoluteTimeRange.start,
          end: input.absoluteTimeRange.end,
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

  if (isEmpty(uniqueFields)) {
    return ALWAYS_CONDITION;
  }

  const conditions = uniqueFields.map((field) => ({
    field,
    operator: 'exists' as UnaryOperator,
  }));

  return { or: conditions };
};

const getSourceFields = (processors: ProcessorDefinitionWithUIAttributes[]): string[] => {
  return processors.map((processor) => getProcessorConfig(processor).field).filter(Boolean);
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

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
import { isEmpty, isEqual, uniq } from 'lodash';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DetectedField, ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';

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
      | { type: 'simulation.refreshSamples' }
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
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYlU1wJIDoAnMAMwdgAsBlHNAByzgG0ADAF1EoboVTViYkAA9EAFgBMAGhABPRAA4AbMpq7BugJy6AzIpMBWXbu0B2AL5P1FbPiLEaKYigI4WCgAXr5QpEKiSCASUl6yCgjKJuY0DmbaAIwmJsbWDtbmDupaCA6KujTmtiaZinWZ1sraLm7oHtI+fgFBocTh-JlR4pL+8dGJyanp9tm5uvmFxZqI1pmp5pnKFopFjtomLa4g7lRePhB8pNx0hADGcLCEdLA0d6w4-WCRsrFjJAlEA51jQDtpzI5FIpCplBNoSogLJlQVtdJlMg4kUZlK0Tu0zrQUJcwNdbg9YE8Xm8Pl9BsMYqNpICEOsTIo0gsjJk7BjrAcEQhFODDPk6lDBMoKvpcadPITiaRGCgsHgwFT3p8YAAFBgANxQYAA7gARe6wABiytVdB+0T+TImiHRgnZ1gq2jWGMEKW0ahWCAh7K2gmBBzZ+QcRzalDl3iwhBwEDCnB4fFgpAgJDAXV1hAA1tnZZ144nk1xeHAEL5c3dY5FbSM4gDHWUQWCIeVoZs4QLtELDA5lC6mkYTAVMjL8bGaCWk-0UxX02rbnQaLx8IxnmgaEXzrOy6nK9X7nWRA2GU2ZC3gal25Cu7D4f6CtYaMpMtpP01I5jNpOY50OAUmqBDzlO0gAEpgAAjhgKAMGgYDEHg6bnva4ygJMErIo0+hWOYliDu+ApNAYgiwkObrmM0fbmP+HTnEBsAgcm4FeFBsHwWAiHIahQy-IyGHyE6brsrs5R8mOWzUYovbItYgiKSoikEaiE7HLutBMSxYEAexMFwQhSEoREyj0uhzaYSJ-bifhn76HU1gCuJIoON62Tcoc6z0QS3h0BgxB+LpDEkBmWY5vmhZsbQ-mBaxekkFWxA1qewhoYJlnCa2t6HB2UIwj2-pDoINCKYp9iSkY1hrD506xUFUDsNFZDLs8a5UJudDbppfkBQ1TUJcQSUpdI9YiAJl7MjeoK5feBVPqUhFVNY4YYto3pCsodG4sQhAQHAsg9RN-xXlZCAALS6AKl2lWVd33XUtWdL4YyBCEYTHQ6Z3cq+JjJGiiiRnCgjmMYAoOBCNDZBKphupKkbbdGIXeGgKAUgei6fUJkyNK+tEIy6IN-SRQ5vtizSic0yjOBpzUXHwWOZYkwYODQ8ySh65j6BtJFbDQI4HIDKS7LoNNI75M4JnOjXlmmjOnVlQobLkth1LoUIesspS+q6W2mJi2wVAUT2McBdCgY1zUcYZ3HGfAdoZQrzODsi1OWLCfLGFzJMldsEoU1CVPWCbMV9fFyPy8ySs0CoZhbRDzQpARArUak76wqDHqfr65QuC4QA */
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
  on: {
    'simulation.refreshSamples': '.loadingSamples',
    'filters.changePreviewDocsFilter': {
      actions: [
        { type: 'storePreviewDocsFilter', params: ({ event }) => event },
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
    missingSamples: {
      on: {
        // 'simulation.updateTimeRange': 'loadingSamples',
        // 'simulation.refreshSamples': 'loadingSamples',
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
          target: 'missingSamples',
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

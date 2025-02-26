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
export type ProcessorMetrics =
  Simulation['processors_metrics'][keyof Simulation['processors_metrics']];

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
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgnzACUdiYA6DABwrzAG0AGAXUVCcKoCJPiAAeiAEySAHPQBsATgCsARgDsqmasUrlAGhABPKQGYALPRWnV8m+eXrp65QF9Xh1JlzCyAMxQsNgAnWHoAYwALWhgABWCwADcUMAB3ABFCcNgAMUCQrl4kEAEhImJRCQRVTnllehlZThlFGXVzRU1DEwRtS05zdXUVeRklFpl3T3RsfHLSJmCsuFhCUIjoug4eUVKUX0rEZVN6cx1HTlVVU0kVLW6j8zkz5TtTRVHdD6mQL1nfegoYj7FA4LAoABeQKgpEKu0EIJExSq8nMnHo6jqqM4jlMphkTwe1Uk6noyk4FLxnEx+Opih+fx85UBwIIYMh0NhqiK-ARB2RiEUA3oNTOQoc8kk5MkRNUJLJFM4VJpMjpDJmTJI9AgYAARoQMMRwtCAMKbGCwBZLcIrNZhKIxbY8kp88qHBCSG70SQ1Ank5Ro9qDImmNSnbRXUwDVH4yYeX4auZanX6w3Guhmx2WsSwPCUeg4PwhAAUKYNRrAABV0GAAJSkRlJ4javXl9NQTNbWBw4p7fmgFF4jGKG6ScyDRrSGRE5TSU4OWrS2wteTq7xNlupo2m81wUg5vNsAtFsDBUuttNVmv1xsAstpndZ9jc+FlJEDxBXCkNTG2Cnjj4ZWMI453Hck6k4H1PlXeNb2ZLBCBwCBoQAZRwNAmCwPcIBIMAWUSQgAGs8LgrUEKQ1D0MwuAECBAjwibQoe15N8KgFYkpQaIV5HaUx1G0H11BDZQ5BkNR5FsNRVHJUM13+eDEOQug0IwrDLVPJZgnoTD8D8NY0HoUjm3IpSoBU6jYFo4h6MYnhmJdVj3TlTiWlqXj+LlDQiUkb9FUgxpFAAmw42mdcARwWBYFPAhlMTXwqDAABHDAUASNAwGIPBLXsvs3XYjQ7B-SVTDqWd5CJcwh3kAZdGka5jneOTNWbCKouCGKzLi8oEuS1KwHSzLspfXtXXfcQzHJBpUX9dQbiuadgIQSVVAxKVaUUL83iajdgkNYFYrC+YcOIPC6KIkiuq1XbiH2zrDpIKybN8JidhGxz2J9MMROq94eNDClysWyqVrxKcHEUKUJJg0L5KuvbUMusgNLWbSfD04IDKM+hrtulDEcerJbO4HLRrYj8PWuRQFFnd4ZBsCGPm8xoGiVJU2g+CxmnMdx42IQgdXgYojNfREyfGhB6jFC5I1uNQFp6ABaEG8RsW4SVeSMCW2gEgRBdkoToEX+3F8x5VDaSCSuDpx3lxAxhFeRHeGES5c4elYMRwEICwo28vJsdahFYZGhuCkCUBnpaQxMYxPJMZySVbmPfu5t723DNd0FljRfdf76FVuPBLafEhMWkTLBj1UfLsAD1G1hSKOUqi1N9saqhqGp88aOmVEgqNhm8yR5G9JUrmq5QPmueutVa6KEZTnqUrSjKstbsX2-B-PWnEyVJSFW2EDRFblADTFqqUK5VAcafmxx+fYbF3K28-EdJAxPu-1NqNjgqyCyRkOm1UpSaEtjzVwQA */
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
          guard: and(['hasSamples', 'hasProcessors', 'hasValidProcessors']),
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

interface SimulationMachineDeps {
  data: DataPublicPluginStart;
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}

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

type SamplesFetchOutput = FlattenRecord[];
interface SamplesFetchInput {
  condition?: Condition;
  streamName: string;
  absoluteTimeRange: DateRangeContext['absoluteTimeRange'];
}

function createSamplesFetchActor({
  streamsRepositoryClient,
}: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>) {
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
}: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<SimulationRunnerOutput, SimulationRunnerInput>(({ input, signal }) =>
    streamsRepositoryClient.fetch('POST /api/streams/{name}/processing/_simulate', {
      signal,
      params: {
        path: { name: input.streamName },
        body: {
          documents: input.documents,
          processing: input.processors.map(processorConverter.toSimulateDefinition),
        },
      },
    })
  );
}

function createSamplesFetchFailureNofitier({ toasts }: Pick<SimulationMachineDeps, 'toasts'>) {
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

function createSimulationRunFailureNofitier({ toasts }: Pick<SimulationMachineDeps, 'toasts'>) {
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

function composeSamplingCondition(
  processors: ProcessorDefinitionWithUIAttributes[]
): Condition | undefined {
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
}

function getSourceFields(processors: ProcessorDefinitionWithUIAttributes[]): string[] {
  return processors.map((processor) => getProcessorConfig(processor).field.trim()).filter(Boolean);
}

function getTableColumns(
  processors: ProcessorDefinitionWithUIAttributes[],
  fields: DetectedField[],
  filter: PreviewDocsFilterOption
) {
  const uniqueProcessorsFields = uniq(getSourceFields(processors));

  if (filter === 'outcome_filter_unmatched') {
    return uniqueProcessorsFields;
  }

  const uniqueDetectedFields = uniq(fields.map((field) => field.name));

  return uniq([...uniqueProcessorsFields, ...uniqueDetectedFields]);
}

function filterSimulationDocuments(
  documents: Simulation['documents'],
  filter: PreviewDocsFilterOption
) {
  switch (filter) {
    case 'outcome_filter_matched':
      return documents.filter((doc) => doc.status === 'parsed').map((doc) => doc.value);
    case 'outcome_filter_unmatched':
      return documents.filter((doc) => doc.status !== 'parsed').map((doc) => doc.value);
    case 'outcome_filter_all':
    default:
      return documents.map((doc) => doc.value);
  }
}

function derivePreviewColumns(
  context: SimulationMachineContext,
  processors: ProcessorDefinitionWithUIAttributes[]
) {
  const nextPreviewColumns = getTableColumns(
    processors,
    context.simulation?.detected_fields ?? [],
    context.previewDocsFilter
  );

  return isEqual(context.previewColumns, nextPreviewColumns)
    ? context.previewColumns
    : nextPreviewColumns;
}

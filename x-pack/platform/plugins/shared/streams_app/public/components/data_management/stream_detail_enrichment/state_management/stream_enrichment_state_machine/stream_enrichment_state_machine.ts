/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MachineImplementationsFrom,
  assign,
  enqueueActions,
  not,
  setup,
  sendTo,
  stopChild,
  and,
  ActorRefFrom,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  IngestStreamGetResponse,
  WiredStreamGetResponse,
  isRootStreamDefinition,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import {
  StreamEnrichmentContext,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { processorConverter } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import { ProcessorDefinitionWithUIAttributes } from '../../types';
import {
  simulationMachine,
  PreviewDocsFilterOption,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import { processorMachine, ProcessorActorRef } from '../processor_state_machine';

const createId = htmlIdGenerator();

export type StreamEnrichmentActorRef = ActorRefFrom<typeof streamEnrichmentMachine>;

export const streamEnrichmentMachine = setup({
  types: {
    input: {} as StreamEnrichmentInput,
    context: {} as StreamEnrichmentContext,
    events: {} as StreamEnrichmentEvent,
  },
  actors: {
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
    processorMachine: getPlaceholderFor(() => processorMachine),
    simulationMachine: getPlaceholderFor(() => simulationMachine),
  },
  actions: {
    spawnSimulationMachine: assign(({ context, self, spawn }) => ({
      simulatorRef:
        context.simulatorRef ||
        spawn('simulationMachine', {
          id: 'simulator',
          input: {
            parentRef: self,
            processors: getStagedProcessors(context),
            streamName: context.definition.stream.name,
          },
        }),
    })),
    notifyUpsertStreamSuccess: getPlaceholderFor(createUpsertStreamSuccessNofitier),
    notifyUpsertStreamFailure: getPlaceholderFor(createUpsertStreamFailureNofitier),
    refreshDefinition: () => {},
    storeDefinition: assign((_, params: { definition: IngestStreamGetResponse }) => ({
      definition: params.definition,
    })),
    stopProcessors: ({ context }) => context.processorsRefs.forEach(stopChild),
    setupProcessors: assign(({ self, spawn }, params: { definition: IngestStreamGetResponse }) => {
      const processorsRefs = params.definition.stream.ingest.processing.map((proc) => {
        const processor = processorConverter.toUIDefinition(proc);
        return spawn('processorMachine', {
          id: processor.id,
          input: {
            parentRef: self,
            processor,
          },
        });
      });

      return {
        initialProcessorsRefs: processorsRefs,
        processorsRefs,
      };
    }),
    setupFields: assign((_, params: { definition: WiredStreamGetResponse }) => ({
      fields: params.definition.stream.ingest.wired.fields,
    })),
    addProcessor: assign(
      (
        { context, spawn, self },
        { processor }: { processor: ProcessorDefinitionWithUIAttributes }
      ) => {
        const id = createId();
        return {
          processorsRefs: context.processorsRefs.concat(
            spawn('processorMachine', {
              id,
              input: {
                parentRef: self,
                processor: { ...processor, id },
                isNew: true,
              },
            })
          ),
        };
      }
    ),
    stopProcessor: stopChild((_, params: { id: string }) => params.id),
    deleteProcessor: assign(({ context }, params: { id: string }) => ({
      processorsRefs: context.processorsRefs.filter((proc) => proc.id !== params.id),
    })),
    reorderProcessors: assign((_, params: { processorsRefs: ProcessorActorRef[] }) => ({
      processorsRefs: params.processorsRefs,
    })),
    reassignProcessors: assign(({ context }) => ({
      processorsRefs: [...context.processorsRefs],
    })),
    sendProcessorChangeToSimulator: sendTo('simulator', ({ context }) => ({
      type: 'processors.change',
      processors: getStagedProcessors(context),
    })),
    sendFilterChangeToSimulator: sendTo(
      'simulator',
      (_, params: { filter: PreviewDocsFilterOption }) => ({
        type: 'simulation.changePreviewDocsFilter',
        filter: params.filter,
      })
    ),
  },
  guards: {
    hasMultipleProcessors: ({ context }) => context.processorsRefs.length > 1,
    hasStagedChanges: ({ context }) => {
      const { initialProcessorsRefs, processorsRefs } = context;
      return (
        // Deleted processors
        initialProcessorsRefs.length !== processorsRefs.length ||
        // New/updated processors
        processorsRefs.some((processorRef) => {
          const state = processorRef.getSnapshot();
          return state.matches('configured') && state.context.isUpdated;
        }) ||
        // Processor order changed
        processorsRefs.some(
          (processorRef, pos) => initialProcessorsRefs[pos]?.id !== processorRef.id
        )
      );
    },
    hasPendingDraft: ({ context }) =>
      Boolean(context.processorsRefs.find((p) => p.getSnapshot().matches('draft'))),
    '!hasPendingDraft': not('hasPendingDraft'),
    canUpdateStream: and(['hasStagedChanges', '!hasPendingDraft']),
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
    isWiredStream: ({ context }) => isWiredStreamGetResponse(context.definition),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAtAA4ATADYK3RYoAsy7soCcAVmVHV2gDQgAngpMUDqo1qOPtqgIynlAXx9XUTFxCYnIqGjpGFjYuD34kEBExOklpOQQlfQoPIwB2TUUDbgBmVWKDZStbBF0HCqNixQ9cwqdFVT8A9Gx8IlJKUIhrdlg+sOIsMAwAN0geeKFRcVSE9MViiia1A0UzIxzdRSqFRQdTDwvlbU0PblyDYs7wbuCxgdIhilHQygwIBjAIzeFGIsDABHm0iSyykqwUpQ0xWUOV2qhauV0qmOCC8TQoLUU3FU3BMRn07SegR6IX6II+1i+wL+AKBPwoAFdBBASAQwJCEtCUrDQOklCp8bkPMVXMo9ESDB5sR5DhRdA1DLcysqOv5nkFemzBgzvrTOdy6CgOBBJGBwtNhABrW2csFoAg08gAQSwBGEaH5i2SEmFsjsDXxxW4mgMGMcxW0RiV5Q22lyssluwuTlylJeBtpRsZbLNPJiYDQaD9FEEDB5ADM-ZQXeX3W9vb7-XwoUshWl4XoKHlVMoM1KyQZtJYbIgxwYKOU7o1cqoV0ZtLn9R73iRPlTcGRUAQKBAMLAayRrGwAAqVyawWB+2DsQS3uAPtCwCg7iABxI94N9hk6zKKq7S6PGRLIrkuTYqUuSgSUK5Sh46x3EYG7UsChZ7jgB4oEeJ5nrWl6Wjewh3u+T4vuRb6PnSfoQOWv6CgBcIZJO6gNCS5TaDopQKjB04IM4pzcB4xiEiUphNDqXSblh9IUDheEEae54kVAZEUY+z6vveVaMQCvLMf+Kwigo1weKqxIjlqyLuIJ1TxiB5h5MqCbcIcjy6jhW50juDLKYex5qcR156ZRuk0fpaAULgJCWnyXYCqZIaik03Cqq4JRkoYZQqNiIkaOJpLmOUabeXJmGGopQX4SFREXmweAYGQ7K1kKFDTBgYAAO4ACI8iQN5gN1fUjK17WlpIXU9QN4JgD6kAAGI9QwECwCZQZmaGGRGPYtyodwE4mOYlRCQYxigbc0pmCoxKKBhrw1QFSl5ipDXqc1k0dcGs19YNBDDcQY29RNbW-TN8WJSNoP9eRsCrQwvKdgsf7bWlJzxpsqHicUxQtMUUrYoUVkmPcUq7KYngGE9+bjLV73BYRX2Wi1EPTSg-3zbyS0QKtYDrU+Ygc51cNDbDc1bTCgHyGuIEKqohT3PjE6FEqRJWQTSLKPjnn3Amfi6igwiMfACS+W83YY7LtxqDjkZ4wT6xeNi8jKhsjjOLk+y5ETY7oT5eZ+dQ4hRKwlrWzLbHyDGpz3H7TjHWqkpu-tFDIiJ6yNNol3GHTflGlHvYx3HDtiQ8ztE8USoDq5+SqAqVNlLJerVQWikmuQxeseZGQPJl0GzrKUaN4qQleATDjQT7pgEp5lVt89HevV3vz-GAPc7aKw6e8Ol3EjsyJXEmpiqjPig+4cOZB-JL2fGvHJcqWkcpTbMfmHOko+w0ZUqC0Sp9pGFVBOKMyo0wH3XLfduDNXp1QIFvTG-dIzlydoTYmQlTDAOVG5RoahG7XEDlVZesDdxM3qizMKpEIqPkQbLTwwDeKOHuIfJEl9CpZFRISYkRNXD7QLgpOB5DVKNQ0uzKaJdAzRz7mKECWhHaV3QTXISPt4L6ApvtQwqZJQCPvoFYRn0qFQHEZDLm4sgaSz6nQmO0F1D43cqmKM-EsQXSurxG6+0lZqE0LoleZD9QfUoU1NmP1Obc36gtPmAshbWJkbKbQDh8auCJu0WUhhsSXUYRlW6XjiSt0tjVB8DBZgQAAErCGEK2H4sTdryGHGTEkmY9hrjEmndQ7hvYJlzgTB4OQjY+CAA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    initialProcessorsRefs: [],
    processorsRefs: [],
  }),
  initial: 'initializing',
  states: {
    initializing: {
      always: [
        {
          target: 'resolvedRootStream',
          guard: 'isRootStream',
        },
        { target: 'ready' },
      ],
    },
    ready: {
      id: 'ready',
      type: 'parallel',
      entry: enqueueActions(({ check, enqueue }) => {
        enqueue({ type: 'stopProcessors' });
        enqueue({
          type: 'setupProcessors',
          params: ({ context }) => ({ definition: context.definition }),
        });
        // Setup fields for wired stream only
        if (check('isWiredStream')) {
          enqueue({
            type: 'setupFields',
            params: ({ context }) => ({
              definition: context.definition as WiredStreamGetResponse,
            }),
          });
        }
      }),
      on: {
        'stream.received': {
          target: '#ready',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
          reenter: true,
        },
      },
      states: {
        stream: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'stream.reset': {
                  guard: 'hasStagedChanges',
                  target: '#ready',
                  reenter: true,
                },
                'stream.update': {
                  guard: 'canUpdateStream',
                  target: 'updating',
                },
              },
            },
            updating: {
              invoke: {
                id: 'upsertStreamActor',
                src: 'upsertStream',
                input: ({ context }) => ({
                  definition: context.definition,
                  processors: context.processorsRefs
                    .map((proc) => proc.getSnapshot())
                    .filter((proc) => proc.matches('configured'))
                    .map((proc) => proc.context.processor),
                  fields: context.fields,
                }),
                onDone: {
                  target: 'idle',
                  actions: [{ type: 'notifyUpsertStreamSuccess' }, { type: 'refreshDefinition' }],
                },
                onError: {
                  target: 'idle',
                  actions: [{ type: 'notifyUpsertStreamFailure' }],
                },
              },
            },
          },
        },
        enrichment: {
          type: 'parallel',
          states: {
            displayingProcessors: {
              on: {
                'processors.add': {
                  guard: '!hasPendingDraft',
                  actions: [
                    { type: 'addProcessor', params: ({ event }) => event },
                    { type: 'sendProcessorChangeToSimulator' },
                  ],
                },
                'processors.reorder': {
                  guard: 'hasMultipleProcessors',
                  actions: [
                    { type: 'reorderProcessors', params: ({ event }) => event },
                    { type: 'sendProcessorChangeToSimulator' },
                  ],
                },
                'processor.delete': {
                  actions: [
                    { type: 'stopProcessor', params: ({ event }) => event },
                    { type: 'deleteProcessor', params: ({ event }) => event },
                    { type: 'sendProcessorChangeToSimulator' },
                  ],
                },
                'processor.change': {
                  actions: [
                    { type: 'reassignProcessors' },
                    { type: 'sendProcessorChangeToSimulator' },
                  ],
                },
              },
            },
            displayingSimulation: {
              entry: [{ type: 'spawnSimulationMachine' }],
              initial: 'viewDataPreview',
              states: {
                viewDataPreview: {
                  on: {
                    'simulation.viewDetectedFields': 'viewDetectedFields',
                    'simulation.changePreviewDocsFilter': {
                      actions: [
                        { type: 'sendFilterChangeToSimulator', params: ({ event }) => event },
                      ],
                    },
                  },
                },
                viewDetectedFields: {
                  on: {
                    'simulation.viewDataPreview': 'viewDataPreview',
                  },
                },
              },
            },
          },
        },
      },
    },
    resolvedRootStream: {
      type: 'final',
    },
  },
});

export const createStreamEnrichmentMachineImplementations = ({
  refreshDefinition,
  streamsRepositoryClient,
  core,
  data,
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentMachine
> => ({
  actors: {
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
    processorMachine,
    simulationMachine: simulationMachine.provide(
      createSimulationMachineImplementations({
        data,
        streamsRepositoryClient,
        toasts: core.notifications.toasts,
      })
    ),
  },
  actions: {
    refreshDefinition,
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});

function getStagedProcessors(context: StreamEnrichmentContext) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.context.isNew)
    .map((proc) => proc.context.processor);
}

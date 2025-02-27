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
import {
  processorMachine,
  ProcessorActorRef,
  createProcessorMachineImplementations,
} from '../processor_state_machine';

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
            processors: context.processorsRefs
              .map((proc) => proc.getSnapshot())
              .filter((proc) => proc.context.isNew)
              .map((proc) => proc.context.processor),
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
      processors: context.processorsRefs
        .map((proc) => proc.getSnapshot())
        .filter((proc) => proc.context.isNew)
        .map((proc) => proc.context.processor),
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAtACYKAdgBsKgKwBmAJxruurZoAci3QBoQAT0SLuARgrdt3e9o+ntm3ZoC+flaomLiExORUNHSMLGxcDvxIICJidJLScgj2JhRqXkbaJkUmeipWtlmOzq7uniVqAUHo2PhEpJThENbssG0RxFhgGABukDyJQqLi6UmZDooALLkLCwaK5poL5rqWNohqBhRbJQ4mKouKDtoNgeDNoX0dpF0UveGUGBAMYD2PFMSwMAEcbSFLTKSzRBXFTaVTaBYmHa6IoOXSFcpQzSnCjXByaHTwkxuUyNO4hVrvf7PayvP6fb6-SkAV0EEBIBDAIKSYLSENAmRhygOC24eRFp00ZT2CAcIs0FF0bj0Cx0+N8-luwRaYXaVJILzeupZbLoKA4EEkYEiw2EAGsrVqHpTOjTDRFjey2AhqDasJ7JOMuZNUhI+bJECoHGoFSpVldHIUHA4pRU8SYlroVoptLGVOdDKTHRTdS7aczWZ6zewwGg0MI0BRBAx2QAzeuUIs6-rUstGiumqDelC+-0oQN8UFTXkZCMeZYq3QSha+LQYmULLRHAzcFwJkybQv3Yvd-U0otkVAECgQDCwJskaxsAAKdcGsFg9dg7EEr7gH7QsAUPqEBBskU6hjOCCaGoSxEoo+7ptBBirtKIrKHmBw+MYJjJjcTTkl2TynhQ56Xtet73o+ZovsIb7-l+P60X+n5UvWEA1qBPIQZCCD6CoCqonoPgIiUKi7BUajrLk6g7vBiowRq+Han8pakSgV43nezZUVANF0Z+36-u+9bXmA3wcpx4EzPyUJuEK2iovY9iGPCihrjm0ZqGiMI7qsLkmIeBEqT2akaRR2nPkZ9GGUxxkNrgJBmpyE7clZYaZNBsFuAhKoHNwsZrsKFBXK4SbIpJ2aBcpzohUeF7qeRWkPmweAYGQTLNryFDDBgYAAO4ACLsiQL5gD1-U9G1HWjt1vWDUCYBYByEAAGK9QwECwJZIbWeGvEuMVkrrAsDmSRua5Jg5xVeRolwqviAWakehF6i8oWNZRLVTZ1oazf1Q0ECNxDjX1k3tT9kgUAlSWjSDA20bAa0MByaDbeCkGSroCpeSo3DLgiirIhddnFR4pzqK4+J4WS1UlrV5L1WFTU6a14MzXDC1LZAa1mZtYPTV1cPDbDc1o9OPG6JcFCbI4ktXCYaj7gsxNErkN03Qrlx6AEtwoMI7HwEknaPJOO3pQoOgKkSeZ4xVKglMr0ryLCyaaE5ihqDULi+NoVVOrq1DiDErBmqb6M8Q43AUPumynDsmwIliKaIOmOKLHBeNu3lDh+8eRFdGH4s2QgQlHI4bsuFh3D4hdmy5N5Dl2R7yYLLnL2lm6ZCF9xxcrLC4oV94RjV5oF0OTkaE5jhspaJVT1BTVxGd1QXxgN3u1zJX0n7jsZz40YtdJkckabPCcuPUp-sngafwegO6-mwgy5OAP7hVzX0p4pHh3ItCrgaGcNuwViKhQfpBBEsJ9DD3xoiQwJg1xyWKt5K4kk3aaFFCoIBi83p1TIppT61EoqfjATxMSTg8yom4PUewWI1BrlPs4DQHhEJfxzFgumIDcENXwRFM0rMBY9zAmbDGV0oG4xgYTeB0oij8U9g5TY5gNyJ3YdfM8XCmYEKgPwiGKA-qDWFsDOaJDi55HISdK4f9PZ0M-vMWEphPYuVWIoTYmD5601USRdRH1eFaO+uzOaA1ObLR5htQ2wZw7FyTIiaS5gxIGBWPbKRqZ5jRioQ4tETiXEqKeB+BgowIAACVhDCAIIRYxe15DymRPlcRdsHbaHcpKCg6xf4pLRGcA8OsgA */
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
    processorMachine: processorMachine.provide(
      createProcessorMachineImplementations({ overlays: core.overlays })
    ),
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

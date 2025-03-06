/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MachineImplementationsFrom,
  assign,
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAtAA4ATADYK3RYoAsy7soCcAVmVHV2gDQgAngpMUDqo1qOPtqgIynlAXx9XUTFxCYnIqGjpGFjYuD34kEBExOklpOQQlfQoPIwB2TUUDbgBmVWKDZStbBF0HCqNixQ9cwqdFVT8A9Gx8IlJKUIhrdlg+sOIsMAwAN0geeKFRcVSE9I9tB3zNE3zHPINcqrsjCibVVTVuT2Lm1SvO8G7gsYHSIYpR0MoMCAYwEZeFGIsDABHm0iSyykqwUpQ0xWUOUUZhauV0qiOCC8TQoLUUV24JiM+naD0CPRC-SBb2sH0BPz+AK+FAAroIICQCGBwQlISloaB0koVLjch5iq5lHorgYPJj1spFBRdA1DB4rjd3GSnr1mYNaZ8qWyOXQUBwIJIwOFpsIANZWtkgtAESnkACCWAIwjQPMWyQkAtkx2KuOK3E0B20jmK2iM8vKIe0uSlYuRHg8Tly2qCuqp+rpzONnJiYDQaG9FEEDE5ADNvZRHaWXS8PV6fXwIUt+WlYXoKHkLqnxcSDNpLDZEMODBRytxco1cucnNpsxTAfnybgyKgCBQIBhYFWSNY2AAFcuTWCwb2wdiCC9wa9oWAUEgQCC+xJdgM9jKKBHKu0ugxlciK5IcE4IKUuSASU5zih4-5zkYq7PHqNIUJuODbigu77oe1Ynma57CJeT63vepGPje1LehApafnyP4whkY7qA0hLlNoOilLKEHVM4SrcB4xj4iUphnKhubjBhWE4XhB5HkRUAkWRN53g+V4VvRfxcox34rIKCjaMJyp3Moi43Ii7j8YgMbKBQ5h5OssbcLo-5Sa6rxvrSck7nuimEWemnkRpVFaWgFC4CQZrch2vIGYGQpNNwyquCUxKGGUKiYoJGgiUS5jlMmxSeeusk6vJAUEcebB4BgZAstW-IUNMGBgAA7gAIpyJDnmAbWdSMDVNcWkite13WgmAnqQAAYu1DAQLA+n+oZQYZEY9jqkh3CjiY5iVJBBjGIB6oSmYKh3IoZXoT5mGVf5+FKXVI3NQGE2dT1BB9cQg0dcNjXveN0Wxf1-1daRsALQwXLtgsX5rUlCj-hsWhhiJxTFC0NzFJihQeP2Fmyo0hUibdeYVTmVXPUFZr1UDY0oJ9U1crNEALWAS23mIjMtRDvXg5Nq1Qr+8hGLUsqqIUuQGFjo6FPKVyE9jCLKFjbmy7Gfj+CAKDCPR8AJFhXmdkjYvqmopxIZj2P-l4mLyOsIZ7IouR5PiTTihTYTUOIUSsGaZuiyx8gHEqsvzk4e0qmKjtbRQiKCf+jRRidKG6yb5U+cH3ah+H1sY3Ldu45io6ObGqiOHoEqmBUPvee8hrkLnzFGRkcupeBU5SuGVdypBXjY5s4HhnLo4mSumc6l51L3c33y-GArfrUKFwuxcJ13AYKheOO1TiqYyrgaiEuKlm085rP+YL6y7LFkHCXm6H5jTmK7sNEVKgtPKW0nFGJlhJJkMG4Buc93h+VwivZGHcwyF2EsXHG4pMSmBOOsZyCJEJbwRGAjcj1cLVResREKN5oFi08P-Vostt4IjdrlLIyJpYEhuK4LauCqY9BpoFWq9M3pMzIaHLQDl0YIKxkgvGkF3YwX0LLJo5R2jmAvl0K+2cIH4IUjVZSDNRr80mt9X6A1JoCPbvIcC6gsYuSTOGXiGJjqnW4udLa0tLg3UvmuO6ajqZPW4VovhuivrTXZpzbmxiNryClBsYurgbjtClIYMu9iUoXWcXcDobi0KU2vAwWYEAABKwhhDNi+KEteiJ+yEjTGYLaJkB7VHFuodwzg0QSzlrLFhOsfBAA */
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
      entry: [
        { type: 'stopProcessors' },
        {
          type: 'setupProcessors',
          params: ({ context }) => ({ definition: context.definition }),
        },
      ],
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
                  fields: undefined, // TODO: implementing in follow-up PR
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

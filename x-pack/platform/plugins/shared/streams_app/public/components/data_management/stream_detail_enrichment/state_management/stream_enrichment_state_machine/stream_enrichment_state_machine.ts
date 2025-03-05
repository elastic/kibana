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
  forwardTo,
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
import { getConfiguredProcessors, getMappedFields, getStagedProcessors } from './utils';

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
    sendProcessorsChangeToSimulator: sendTo('simulator', ({ context }) => ({
      type: 'streamEnrichment.processors.change',
      processors: getStagedProcessors(context),
    })),
    sendFilterChangeToSimulator: sendTo(
      'simulator',
      (_, params: { filter: PreviewDocsFilterOption }) => ({
        type: 'streamEnrichment.changePreviewDocsFilter',
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAtAHZFAJgoBWAMzqVKxQBYAnNq2KANCACeC9YYqHu+ld24AOQ+8P7XrgL6+LVExcQmJyKho6RhY2LgBGfiQQETE6SWk5BCV1fQoANn1FV3047jjFN004i2sETTyKTRc8w0NFQwKVPPUC-0D0bHwiUkowiEt2WGHw4iwwDAA3SB5EoVFxdKTM3JVC-Sr9zVd1W111GoUKjW4Krw8uwxU4-T7wAZDp0dJxiimwygwEAYYEmnwoxFgYAIK2kKQ2Ui2iDirjUcROjgqmgM3BOrguCDiXXUFEKcSqemMZWUryCg1CI3B30svzBgOBoP+FAAroIICQCGAYUk4WkEaBMvIUYoSXlXMiVA5uCpXG58c8VMTNMY8nlFOpkQV1DT3kNOWNmX8GTy+XQUBwIJIwBEFsIANZOnmQtAEenkACCWAIwjQQrWqQkYtkCiMrhJDzJTg8+jyKjVWu4JP03DypS6miMKeNwVNDPNLM51v5sTAaDQwYoggY-IAZsHKJ6az7PgGgyG+LD1qKMgoiRQ9E1DDljKo4tUrEjtA1tA5lOV3MUjQE3sXfV8SD9abgyKgCBQIBhYI2SJY2AAFOtzWCwYOwdiCB9wZ9oWAUfcQUPJIOEbDlkriaGo3idPm2ZPMo+L1NK3jcPUOZVGBNybv0O5gmWh44MeKCnuel5Njedr3sIj5fq+76UZ+L6MsGEA1gBIrAYiWT6MmGhNFoXjFPUhjlPi6g+BQZSTiqyEanKeRFnSOFMhQeEEURF5XmRUAUVRL5vh+T71sxwICqxQGbOK0ZlDKSqKHk5LPLq8FOPk+jqIozyuY4yqaPJHxmkpKknme6mkXe+nUXpdEGWgFC4CQdqCv2wpmZGEpyhmrkONoSodEcqbzggomxhJOg9PsbQqD5W54bujL7sygWEcFJHXmweAYGQXJNqKFALBgYAAO4ACL8iQ95gH1g2TB1XVVpIvX9cNUJgIGkAAGL9QwECwKZ4bmVGnG2GOs7KscJw5nExj4q0qLFCUcSyooy6GL5JYzAFJqqc1GltTN3URgtg0jQQY3EJNA0ciMACin1BXFCXjeDQ2UbAG0MAKfarIBe2pZcT0UBURS6pO7mEucBXuJo9hovqlPuDqKivbVuGw01xE-Xa7Wdf981I8tq0QBtYBba+Yjc3NKCA8No2I4tu3wiB8ieeJl0+CcXEKjq+hqjixW2bYXiVZTcnVSazMfcWX3s6FnN-RLUtDfzAqC5t22Q+QMOW0Fzauz+ABU8tDhx8jgWOrirm4TxCR0+KuLK+StN0jxkvcJtbigwjMfASQ1Z8A444rbQNJBTjQSm5TmAV8hosVNxuDiT33eUTOspE9BMKwdr5wrwePMSuwlKoCoajk5O1PIKYUGiTjSaoPiVXELf+fV3dBxZWSPLGJeVVm5dwQVhIZoaBhue4JT6i8pvYcvPyWuQq-sevkp6jKcoooqyqqgfO-2JlhQqsmPUi8r4KRvhaVkQIwAP32hKHosYk5yjaEUJwJQ0y6EzDmDUk4dAuEvlhUBpYlJ33bLyKsXdkoF2DrYXIJR9jKHAlmLUY8kQnAgimTQWo1bgRaEvQh9VlKswINA3GoEVQkjjqXXesFK61BHlPVyc9jhtG4I8Xh71+GNTUi1TS2l6LfmEYrHMxJvAdHaHkFR4Fw4iSVBQY4spszITRNgtRe4DyCO+jbKAXNZpr2xj3J+KI4gExuHHdobkTrMIQI3KerRlC7EqrYB6Li6puK9mzEKrVbbix6kjGWYNFoGODrKKm+wuLgSqDccomhrqPCnndWcj1nrJJZmkrRHMvF2xyYtR2AoBZCxFoUp+ZI1DIW6CqMxblszVIKjdOpXEGnh2XIoZpcBhAMCWBAAASsIYQXZ-iDIOvIHo0pJxEnDnZMCep8QTxKY4ZE-EsQ5llP4fwQA */
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
        { type: 'setupProcessors', params: ({ context }) => ({ definition: context.definition }) },
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
                  processors: getConfiguredProcessors(context),
                  fields: getMappedFields(context),
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
                    { type: 'sendProcessorsChangeToSimulator' },
                  ],
                },
                'processors.reorder': {
                  guard: 'hasMultipleProcessors',
                  actions: [
                    { type: 'reorderProcessors', params: ({ event }) => event },
                    { type: 'sendProcessorsChangeToSimulator' },
                  ],
                },
                'processor.delete': {
                  actions: [
                    { type: 'stopProcessor', params: ({ event }) => event },
                    { type: 'deleteProcessor', params: ({ event }) => event },
                    { type: 'sendProcessorsChangeToSimulator' },
                  ],
                },
                'processor.change': {
                  actions: [
                    { type: 'reassignProcessors' },
                    { type: 'sendProcessorsChangeToSimulator' },
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
                    'streamEnrichment.changePreviewDocsFilter': {
                      actions: [
                        { type: 'sendFilterChangeToSimulator', params: ({ event }) => event },
                      ],
                    },
                  },
                },
                viewDetectedFields: {
                  on: {
                    'simulation.viewDataPreview': 'viewDataPreview',
                    'streamEnrichment.fields.*': {
                      actions: forwardTo('simulator'),
                    },
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

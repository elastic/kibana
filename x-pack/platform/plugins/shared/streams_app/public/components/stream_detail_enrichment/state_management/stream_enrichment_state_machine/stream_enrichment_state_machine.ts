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
      simulatorRef: spawn('simulationMachine', {
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
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
    isWiredStream: ({ context }) => isWiredStreamGetResponse(context.definition),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwGJYjSyA6YrMDAN0gG0AGAXUVAAcA9rAwEMglHxAAPRAA4ATABoQAT3kBOACx05AVg0KNANgDspgMxatARgC+dlaky5CxcnQA2GaqgwooADFBNAARMAAzf1FxFABhHBIAuCoaD0ZmNgguXiQQIRExCSlZBEUVdQRTDTk6LU5jBTkLfVN9Y3tHcHRsfDT6aLESbwAvfygKHKkCmOK80osNPTqGpua5Yz1WrQrEExs6Tn05DU49Tg02i4cnHtd+ukGMYYwxgMmbXIFhWcl5xEWy3qjTk602212ZRstWMFiaFwUpmMWlhchu3RcfXc9GIsEEniyCQwnggbloqWxDDgYAIUzyMyKf1ACyWKxBYK2elMOzUexsnDonNOcJsizM6OcvTJ6Tg+MJOGJpP6FNodAArvwICQCGA6d9CrESogFI06BYLAY4Rp+RZOJweZU5ActBpXa6LXpjHJrBK7ljVbi5ZAiSTpfQID5+J4SKpxgAFNCCJiwPFoWAUfiJ5Op2B0EgQbI8aY-RlGhAWMx0Dpw4ycCzchRbC2QmzGU66BRaPSNjp6LTehS+zFhql4gnBhWhh4R2BRmPxrNwHMZxcpkK54ghCBgNB6-Ilw3-BBGDR0JrnNtI6FbGwtz2mOrQoz20ycBRGPRDqUPQPjiAhpVKRnOdYwCBMkyXdcVwgtc0DobdPBpXUi3pA85mZAFK2rBRoVFSwOlMFtbAfM5QXNC49FtF0v3uSlf3lRUR2A6NQKgcDsygzMYNTOhcCSGA9wZQ8MPLLDRRwp16wrGxCN5BBxIFWsuQtV8DBNUwaP9GUxwYqcgMjFjxjwDAyDVaNGToFgMDAAB3UJtRIBMwCs2yqBMsztViSzrLspCsB1CBAmsklYEEtCmRkAELAOZEGjfE1mnqW85JsV0H0sTgkU9btWxsQcuklWiA1lP8AKYgz5wCYzTPMryXN8nV-MgIKwBCtyas8iRvNs+yCEc4h6rCg10Mi8tzkOBRzWML0rHtJ09BbbQH0mo4FDODQ4S0FpNJHDUtTEKrlQgCQwEeFAWEEABrU7Cq0+g9s8w7sQQfwLqwTqUByIbfjLE0FDNC0NqMG07QdAFJsOO031BMilhNHaHgeg6oDDCgd0TOC5wICIQnoW7ds1R6Uf6F7zqTD6vpQ-UfqPQxITMYw2RNGS4UWGoHC6FBBG3eA8nx-pi2GiLSgAWmMSExchqHpelj0EcpbxfBQcZgjCSIngkBJ+LgQWaZE85ljrU5+yN7lTC5SELVqLtotMRE5AuRZ5dVJ4XjeKBddLI8-sFRZVqdORVLBhBrQOI41K2zabD0T8Cr9Ed6InRiBdQoWyz0ZLKjy806H5LktCRLa320Z3tKDf9J0A1VmMqtjVxzT3hNG1KdGi5EY-BY5LBbJ1TxWpFMtrSwNFLnESt0quPBr1jqo8r3qfn0bXR7gw6AywOC7MTs4VH0dy7K6cKpn9zaq6+rev65yfMbkbShsAvFsos176Ob1KI2cxd8Tivk-02dDKqifD63UGpgCaoFYKEBeYLybqUDotRo4EVfNadaygUpLGWE6Ww1gkSXAsLvJGRkU4wNvogLQaCs5IjXucTgMkcL1HPF-cekAABKghBAEDDDfYWiALZyRwtCM8tpTD8hEaIxQHM7BAA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    initialProcessorsRefs: [],
    processorsRefs: [],
  }),
  initial: 'listeningForDefinitionChanges',
  on: {
    'stream.received': {
      target: '.initializing',
      actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
    },
  },
  states: {
    listeningForDefinitionChanges: {
      on: {
        'stream.received': {
          target: 'initializing',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
        },
      },
    },
    initializing: {
      always: [
        {
          target: 'resolvedRootStream',
          guard: 'isRootStream',
        },
        {
          target: 'resolvedChildStream',
          actions: enqueueActions(({ check, enqueue }) => {
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
        },
      ],
    },
    resolvedChildStream: {
      type: 'parallel',
      states: {
        displayingProcessors: {
          on: {
            'processors.add': {
              guard: not('hasPendingDraft'),
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
              actions: [{ type: 'reassignProcessors' }, { type: 'sendProcessorChangeToSimulator' }],
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
                  actions: [{ type: 'sendFilterChangeToSimulator', params: ({ event }) => event }],
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
      on: {
        'stream.reset': {
          guard: 'hasStagedChanges',
          target: 'initializing',
        },
        'stream.update': {
          guard: and(['hasStagedChanges', not('hasPendingDraft')]),
          target: 'updatingStream',
        },
      },
    },
    updatingStream: {
      invoke: {
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
          target: 'listeningForDefinitionChanges',
          actions: [{ type: 'notifyUpsertStreamSuccess' }, { type: 'refreshDefinition' }],
        },
        onError: {
          target: 'resolvedChildStream',
          actions: [{ type: 'notifyUpsertStreamFailure' }],
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

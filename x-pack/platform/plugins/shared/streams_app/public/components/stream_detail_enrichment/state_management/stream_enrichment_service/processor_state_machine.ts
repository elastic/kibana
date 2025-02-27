/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ActorRef,
  MachineImplementationsFrom,
  Snapshot,
  assign,
  emit,
  fromPromise,
  sendTo,
  setup,
} from 'xstate5';
import { isEqual } from 'lodash';
import { OverlayStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { ProcessorDefinition, getProcessorType } from '@kbn/streams-schema';
import { ProcessorDefinitionWithUIAttributes } from '../../types';

export type ProcessorToParentEvent =
  | { type: 'processor.change' }
  | { type: 'processor.delete'; id: string };

export type ProcessorParentActor = ActorRef<Snapshot<unknown>, ProcessorToParentEvent>;

export interface ProcessorMachineContext {
  parentRef: ProcessorParentActor;
  initialProcessor: ProcessorDefinitionWithUIAttributes;
  processor: ProcessorDefinitionWithUIAttributes;
  isNew: boolean;
  isUpdated?: boolean;
}

const getParentRef = ({ context }: { context: ProcessorMachineContext }) => context.parentRef;

export const processorMachine = setup({
  types: {
    input: {} as {
      parentRef: ProcessorParentActor;
      processor: ProcessorDefinitionWithUIAttributes;
      isNew?: boolean;
    },
    context: {} as ProcessorMachineContext,
    events: {} as
      | { type: 'processor.cancel' }
      | { type: 'processor.change'; processor: ProcessorDefinition }
      | { type: 'processor.delete' }
      | { type: 'processor.edit' }
      | { type: 'processor.stage' }
      | { type: 'processor.update' },
    emitted: {} as { type: 'processor.changesDiscarded' },
  },
  actors: {
    confirmDiscardChanges: getPlaceholderFor(createConfirmDiscardChangesActor),
    confirmProcessorDelete: getPlaceholderFor(createConfirmProcessorDeleteActor),
  },
  actions: {
    changeProcessor: assign(({ context }, params: { processor: ProcessorDefinition }) => ({
      processor: {
        id: context.processor.id,
        type: getProcessorType(params.processor),
        ...params.processor,
      },
    })),
    restoreInitialProcessor: assign(({ context }) => ({
      processor: context.initialProcessor,
    })),
    updateProcessor: assign(({ context }) => ({
      initialProcessor: context.processor,
      isUpdated: true,
    })),
    emitProcessorChange: sendTo(getParentRef, { type: 'processor.change' }),
    emitProcessorDelete: sendTo(getParentRef, ({ context }) => ({
      type: 'processor.delete',
      id: context.processor.id,
    })),
    emitChangesDiscarded: emit({ type: 'processor.changesDiscarded' }),
  },
  guards: {
    isDraft: ({ context }) => context.isNew,
    hasEditingChanges: ({ context }) => !isEqual(context.initialProcessor, context.processor),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAIwB2AGz5xAZgAss8QFYANCACeiZcoBM+RgA5ZJ+fMO6AnJN3KAvnfVosOPEVLlqdeqNZIQyBw8fAL+IggS0nKKKupaCIai+MqMqYyiovLWVqIOThjYsLgEEKgAhgBm3PiQwcRQtM6Fxfiw3GUwTH7sXLz8guGiurJJ4owjtnGIuqKyMtaGUpnZlqKSeQEFriXlVTUQdQ1N2-iYZcTYFF2Cgb0hA9o2MvIzi2qaiPKihslp6cs2VbrRybFxFNylSrVWq8eqNLbgghnC5gK6+G5BPqhUDhPRTCKSRYyIwmZSSWS2IEbY6I-CQvYwzhwmktTAAC3OnRYGLu-TCiAUlnwojJkw+CF0hnkzyUygyWUBs2pCJa9OqmH4FU4qAAtkyoAARTiwM6oCAAYQ59TgtAg-DA+CZVHQAGsHSyIbt1ZrtXr6kaTWUzZbOXAEE6sGUsV1rv5bsE+TjEDZ8SLJMp8MMJHJZpS1sqwaqvacfbr9QHTRarTBYLQwKgMARkBQoxU8Dr8B6dlCS8QtWX-cbKyHrbBw8RnWdoyxYz0E9jhMnJElLFJRe94kokn9-gqcsD8oW3Bq+5woIQyBBHRAKGB4UeCDDZwFMfd+REJPjLLZksZSeS8wPUFmmPH1z0vfYeEg2EjhVNxCGQCAozAZ94yxB4IkYdNhQkb5YnFVdpBJf8KWUKkQS7XstXAyBoOg-V7xApFzkuVDX0TRcEFkSwM2UQwyNlVMRiSSQeJGeRxEsb8+NkAsmKos8L1omF6OZODmJRNFuhfXkF0GLCMwycQ8I3MQhmkMxdGMrDSPIw95JPailKvFTGTUh86VRMBuBQ7k43YvSBR438BPw+JMgkYUxMySTpOMOSTkcxSINcg4YMYxLq187S0LfJMIjxcUhnEaUMkYLITDGQlxAS2kkpoly0oUgdDSHIMq1DWs7WIB0IzdTt1IUhq6KSlqK3akca3HScoxCGM-LndD31EAycOMt5U10LJ8ClQxrBsvNZIowb6uckbSz9VrA2DLLa3rRtOxbbg211AaPNOlKmtGy7xpuzrpsjadmDY3SMKyaULHGIZTIiXRJFK6KJKk2x4uO96wLOlTvvLLyfIABXU217UdCdXXdE6Mc+qDsf9XGwAJh8AanOaZwWnT5wwkURhkEzU3kQl8B4v8yVs-M0YcynlK+i6cdvfHCfutxm1bds3ol09hqxmXabl+n1KZ2b+HmnKArByxpTFcLZFE-BROUcTYpRo6QWIdAIDgG51J5Dn3wAWkkfF-dqloSDIXAvAgb2lvyl58UMaQ1kkJPxESQFlHEGrxZONUo7yzjZHSYV11TVdMxiOUARyI77Oz4s3KgXOOPCbifhUbisMtz5ZiLtJ5RWJUs9pNVmp+tq-tHRvAoQVZxFt4vxVkCwDD-BRzCsGwJOD0CNecyeMLJOPF+XkxV4sbJ7EH1lJavTgbzAPflq+OZXjCsRJSid-zFzMixZrurr+gg-fKK15CpkiLbRGjsZJbyRAA1KhwgGcV0IXMia4bApD+LIPmjB9BykkCVSqWFFgwKGpjaWp4xpjw6hPfyoN3wqEYMkTaKhMwp3hokUWQFKIfSltTbWho6YMyYog8IDCmFFUXowjO8cv6cJIe7XWkdaE+3yvgkuxlMzERFoBBwDggA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    initialProcessor: input.processor,
    processor: input.processor,
    isNew: input.isNew ?? false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'configured' }],
    },
    draft: {
      initial: 'editing',
      states: {
        editing: {
          on: {
            'processor.stage': {
              target: '#configured',
              actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
            },
            'processor.cancel': [
              {
                guard: 'hasEditingChanges',
                target: 'confirmingDiscardChanges',
              },
              {
                target: '#deleted',
              },
            ],
            'processor.change': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'emitProcessorChange' },
              ],
            },
          },
        },
        confirmingDiscardChanges: {
          invoke: {
            src: 'confirmDiscardChanges',
            onDone: {
              target: '#deleted',
              actions: [{ type: 'restoreInitialProcessor' }],
            },
            onError: 'editing',
          },
        },
      },
    },
    configured: {
      id: 'configured',
      initial: 'idle',
      states: {
        idle: {
          on: { 'processor.edit': 'edit' },
        },
        edit: {
          initial: 'editing',
          states: {
            editing: {
              on: {
                'processor.update': {
                  guard: 'hasEditingChanges',
                  target: '#configured.idle',
                  actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
                },
                'processor.cancel': [
                  {
                    guard: 'hasEditingChanges',
                    target: 'confirmingDiscardChanges',
                  },
                  {
                    target: '#configured.idle',
                    actions: [{ type: 'emitProcessorChange' }, { type: 'emitChangesDiscarded' }],
                  },
                ],
                'processor.delete': 'confirmingDeleteProcessor',
                'processor.change': {
                  actions: [
                    { type: 'changeProcessor', params: ({ event }) => event },
                    { type: 'emitProcessorChange' },
                  ],
                },
              },
            },
            confirmingDiscardChanges: {
              invoke: {
                src: 'confirmDiscardChanges',
                onDone: {
                  target: '#configured.idle',
                  actions: [
                    { type: 'restoreInitialProcessor' },
                    { type: 'emitProcessorChange' },
                    { type: 'emitChangesDiscarded' },
                  ],
                },
                onError: 'editing',
              },
            },
            confirmingDeleteProcessor: {
              invoke: {
                src: 'confirmProcessorDelete',
                onDone: '#deleted',
                onError: 'editing',
              },
            },
          },
        },
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'emitProcessorDelete' }],
    },
  },
});

export const createProcessorMachineImplementations = ({
  overlays,
}: {
  overlays: OverlayStart;
}): MachineImplementationsFrom<typeof processorMachine> => ({
  actors: {
    confirmDiscardChanges: createConfirmDiscardChangesActor({ overlays }),
    confirmProcessorDelete: createConfirmProcessorDeleteActor({ overlays }),
  },
});

function createConfirmDiscardChangesActor({ overlays }: { overlays: OverlayStart }) {
  return fromPromise(async () => {
    const hasConfirmed = await overlays.openConfirm(discardChangesMessage, {
      buttonColor: 'danger',
      title: discardChangesTitle,
      confirmButtonText: discardChangesConfirmButtonText,
      cancelButtonText: discardChangesCancelButtonText,
    });

    return hasConfirmed || throwUnhandledError();
  });
}

function createConfirmProcessorDeleteActor({ overlays }: { overlays: OverlayStart }) {
  return fromPromise(async () => {
    const hasConfirmed = await overlays.openConfirm(deleteProcessorMessage, {
      buttonColor: 'danger',
      title: deleteProcessorTitle,
      confirmButtonText: deleteProcessorConfirmButtonText,
      cancelButtonText: deleteProcessorCancelButtonText,
    });

    return hasConfirmed || throwUnhandledError();
  });
}

const throwUnhandledError = () => {
  throw new Error('Unhandled event');
};

// Discard changes prompt copies
const discardChangesMessage = i18n.translate(
  'xpack.streams.enrichment.processor.discardChanges.message',
  { defaultMessage: 'Are you sure you want to discard your changes?' }
);
const discardChangesTitle = i18n.translate(
  'xpack.streams.enrichment.processor.discardChanges.title',
  { defaultMessage: 'Discard changes?' }
);
const discardChangesConfirmButtonText = i18n.translate(
  'xpack.streams.enrichment.processor.discardChanges.confirmButtonText',
  { defaultMessage: 'Discard' }
);
const discardChangesCancelButtonText = i18n.translate(
  'xpack.streams.enrichment.processor.discardChanges.cancelButtonText',
  { defaultMessage: 'Keep editing' }
);

// Delete processor prompt copies
const deleteProcessorMessage = i18n.translate(
  'xpack.streams.enrichment.processor.deleteProcessor.message',
  { defaultMessage: 'Deleting this processor will permanently impact the field configuration.' }
);
const deleteProcessorTitle = i18n.translate(
  'xpack.streams.enrichment.processor.deleteProcessor.title',
  { defaultMessage: 'Are you sure you want to delete this processor?' }
);
const deleteProcessorConfirmButtonText = i18n.translate(
  'xpack.streams.enrichment.processor.deleteProcessor.confirmButtonText',
  { defaultMessage: 'Delete processor' }
);
const deleteProcessorCancelButtonText = i18n.translate(
  'xpack.streams.enrichment.processor.deleteProcessor.cancelButtonText',
  { defaultMessage: 'Cancel' }
);

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
  | { type: 'processor.stage' }
  | { type: 'processor.delete'; id: string }
  | { type: 'processor.changesDiscarded' };

export type ProcessorParentActor = ActorRef<Snapshot<unknown>, ProcessorToParentEvent>;

export interface ProcessorMachineContext {
  parentRef: ProcessorParentActor;
  initialProcessor: ProcessorDefinitionWithUIAttributes;
  processor: ProcessorDefinitionWithUIAttributes;
  isNew: boolean;
  hasChanges: boolean;
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
      | { type: 'processor.stage' }
      | { type: 'processor.cancel' }
      | { type: 'processor.delete' }
      | { type: 'processor.edit' }
      | { type: 'processor.update' }
      | { type: 'processor.change'; processor: ProcessorDefinition },
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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAIwB2AGz5xAZgAssyQFYATAA55o2evUAaEAE9Ei2fmXrZsxo1GNx4+Y4C+zg2iw48RUuWp16UVYkEGQOHj4BEJEECWk5RRUNLR19I0RlSWlGS2tbe0cXN1CMbFhcAghUAEMAM258SAjiKFoPMor8WG5qmCZg9i5efkEY0VVZURlGDXVGZQBOBYdGeQNjBFkF1XxdW3lJWXFF1RVZV3dSr0qa+saIZtb26-xMauJsCn7BMKHI0Yykh2jlUonUyismXUqjW6U2NnwNhskhyjk0okkFxKnnK3iqdQaTV4LTaV1xBDeHzAXyCP3CwyioBi0PWiHB2VyqmUjEk2j5WOe5Pw+LuRM4JMFnUwAAt3n0WHS-iNoogFAt8KJMqoYacFlolqzYll8DCjqpVjlGEoFsoBWTOiKGph+LVOKgALbiqAAEU4sDeqAgAGFZS04LQIPwwPhxVR0ABraOSvG3J0ut2elq+-3VQMhuVwBCxrDVBn9b4hX4RZVMsQTKbiGZ7RbLRuwjYTdQaiFA3szWyyVR2nEO1OvdMer3ZgPB0MwWC0MCoDAEZAUUu1PDu-DJm4E8fEV2TrN+mf5sOwIvEONvMssCuDauM4SILJTZaSeTLeRqUTydSSIaXI7NyNgSPI9h-vYQ7FLuXQ9DAEAxhAFBgKSI7eESD6hPS-wqrE9iGuM2iIkoyjKOI5pAt+w4dN43S9JA9w8MxxJPPa3iEMgEClmA2FVgyAIEeRGoSIwCySI4KjzKoRGnGYPaHCs2qSLotEvAxiGsaxXroXRFLvJ8-G4TWL6bOC5jggstgAeMRwHERFE7KINoQgsczjBBmKwRxBCaUxRI6RKvmvIZ1KBAMOFKs+YzzMoomNhJUncmoRE6NIeqqMstguU4hzqUK-lIYFYrBRhlTUmA3B8QqlYmTFqoWRYiw2byExSURkniPgkiuVlWifksto+eV8GMcVDyEpNulwTKBbGdFQl-rJcKagoPV2AsYLajkWTqAVnRFdpzqHhmU6nrms4FgukbENGxaJjuIVHYFJ1HpmPoXXmc6FsWt6ROWtWPoJ+F2CJohiUlBwpStGyanY+BqtYXJKKpOgHfRCEBZNB7vedObfddi7Lt4a4bluT2jS9ONvWdJ4E1dF5XjepYA-eQNRU+Qn-vIuzmqocjbZR6jiI5MI9TaX6HJCWziBjflYxNLG08ePqVdVAAKvkRlGMbXgmSbPYrx0Th93rq2AWvlczJZ3swC1c6DX683qygSHMvVHHIRGUeqP4AYclhApM+0jfpY1aa9ptThbVv6cTK47uu3Cbh6lPh9TyvR1mse+Tb-38IDkUCXhtYIDzJqgXYOgYl+2iddYGo2pRAuqeoSzyzuS5cN0TGcChaFwVhHMl6ZMTLERIvSALIsCzavUonLYcvMg3d+tVStTY8ekvFxPHVQ7INl2D8UQ4lknQ-MQH-t1BxOFovt-hIner6gPcb9ppXsaNlJGSP9VCSOPFZq1kwRtXsoBOEoISJNi1NqJw4Il6XFGq-d+2MWJfx3kKX+4VaR1UWqDOKCVxIX2ksoICoJ1Q6GUBBACVgXLnGXkKVB690FbzYlgh0FtD6lzMkAyyLUwF2Q6lA+QoINoYhRDJcS2oX5r17pvIK39w5zTDDwseYhBwUPEF2NQqlxhWkOIsORb9WGKJVmbL6jN5w6zunrOMj04IsIUSbU6qtpyXXPPOfOrNC7s2LgAwhP5iFQzIURbY8QdEUQxIOSwMITFoPMdnT6DMvHhiXInMmKcKZOPkR-KObjLGpJ+peP6vjiBF0VI7Mu98+YzEFtCYWosoE8mARoY45EHBgicAksxri8Y51QprbWt17r60cSFZx+SabJPNkMy2ecyl23UQ1BAGgXKI2skoCQjgmztkQKcaEPUqLLG2gocEvSXEFIGWreZcdrgJ1JsnVO25cmmKuTMwpMc7mLP1gXCp-iqlHzMrUmEQ0z5ZBhBIIC9lRJgghBBeQddGHIPDlMpie9eJIX7qhThmFJorKWlsaQSK3aWDbCoMEQFbAZUMToKwtCAKXI-pi6ZGDpplXDqymqASCFlwmEi8wQINCrDdpqVS1LND4CRdCM0NCZHyGZRi7iWLP4cuUS8HBXx-58rMhiY4pE7DgkyBYduMLjSajEV+eYAEmVMM6OipC3LFGYNmmFGkvLqlmQFbzOBcwfwQyhBQ+wuwaGZCStoJVTqVVsvYTNEKEBuE6q9WMSS8UrRGvIioXQCxr7iCmCofU2wrTbAWFGogMa2FKLxRSH6hKnaTGlQG8lqxKVpA7LEoVNo9g5Cyvle1pM8nKv3lWix+MzwlNsWMhxhsUFDujSOpJXz6YTuuj45ZybgUxB9UK7U-qxVBqgdYXm1hxALFifKiS5bnX9Lpik1dF5HmrmeTkyZ86K2Ltve4qxaTSl-PKZU-BKaxAOF5qcMNbc5D+phWCHqblVIrF0ORa9lal03LmVVBZ5Up32INunFe76b3XLvRh4Z1slls3tpu3h271AbK2IYnZEFkhATUGYB+EJxJyEcIqgdq5COoa-WbXO2GMlPPJmnN5iSP2quI+4kT+l12UfrcfBwZhepuz1LtPIzSOxWu7FsMEW02pSFcMUYg6BE3wErL5IFNHEAAFpxiGgc12Y41FepLGrr1JB2IuW+FwP4CAdmNHl1hhkCi+BjMnBRroDQndHQhdWdYKY4r4G6iLYaHRMhFBtgmAhrKMFUUvEdEopLgD3IyAhLPAWLl5g2iAnqHqX5z1IvhnqXjxWhSlbHSuzxJTyv4S2t1FQvJ-yywUE4IChxLJWG1BJbY+ait+Y0orQbNTIFw3GMApQAarU2Hbp3I6OKwDrb1UcElzajitrJY5JwJpZhtjdhYcSR3jZEjO+PfZsRctNwou5XKyxNBvfGmqx4n2xBbXMB+f8NgYQAVWJ1GbthGzaDo2ekEIPI6fPQz+gbQGt2IF2dKpY7krCDj1AaVaEJ4oOHbksGEFEadY9HbMhT1wIcIGJy1snc3Ke5tWp+KYM8RaipIacKNnOlA+10DIHRjgMSZAkBictJ3OfaEyE2sl13oZUtWroLsWy24ixOBcvjXd3mxs55ocJ2WmyDTPf+CSy2pN9JKuq9XdHodSFhzMf8KJvswh5FF+hSKfyyEyCoctcmikPvnJzuQjAScM60HPeH1KpASMcBCM921o845I+z8kCfG486hWn-8MKLK5U0IOHk-5LAocXeryEWuwQ67beErK0qrQQi5G7M97km+qrVwT+zaysjxXboY3Z56rQwq0BqEWi3RUSCUMPq3Y-Qto-Y1dilt2oH1gM2ezzoJ4nm8dTJ2NZWt+rL-F71YGhJiNnzUcdtByfwZWOMWsR5ErQopW2YQE0-Rj3HX62uk535nVFdn1StCkFsHISPW7243cicHPUmG8i6wdWANkwL3kx+XKkgJmGgIDUkjgJRE1GvgjxNAuxcndl-wSwtmC1v0AV2iiykAhnBCRAUB9itGmE0AsHhy2jdjM2cCAA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    initialProcessor: input.processor,
    processor: input.processor,
    isNew: input.isNew ?? false,
    hasChanges: false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'persisted' }],
    },
    draft: {
      initial: 'editing',
      states: {
        editing: {
          on: {
            'processor.stage': {
              target: '#staged',
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
    staged: {
      id: 'staged',
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
                  target: '#staged.idle',
                  actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
                },
                'processor.cancel': [
                  {
                    guard: 'hasEditingChanges',
                    target: 'confirmingDiscardChanges',
                  },
                  {
                    target: '#staged.idle',
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
                  target: '#staged.idle',
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
    persisted: {
      id: 'persisted',
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
                  target: '#persisted.updated',
                  actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
                },
                'processor.cancel': [
                  {
                    guard: 'hasEditingChanges',
                    target: 'confirmingDiscardChanges',
                  },
                  {
                    target: '#persisted.idle',
                    actions: [{ type: 'emitChangesDiscarded' }],
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
                  target: '#persisted.idle',
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
        updated: {
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
                      target: '#persisted.updated.idle',
                      actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
                    },
                    'processor.cancel': [
                      {
                        guard: 'hasEditingChanges',
                        target: 'confirmingDiscardChanges',
                      },
                      {
                        target: '#persisted.updated.idle',
                        actions: [{ type: 'emitChangesDiscarded' }],
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
                      target: '#persisted.updated.idle',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { assign, sendTo, setup, type ActorRefFrom, type AnyActorRef } from 'xstate';
import {
  SLOT_POSITION,
  type ProcessingNodeRef,
  type SlotPosition,
} from '../../../services/unit_graph';
import type { ProcessingDiagnostic } from '../../../services/unit_diagnostics';
import type { UnitSignal } from '../../../services/unit_pipeline';
import type { DraftProcessor, UnitProcessor } from '../../../services/unit_processing';

/** Where a processor created in the flyout joins the slot's list. */
export type ProcessingStepPosition = SlotPosition;

export type ProcessingStepStatus = 'saved' | 'new' | 'updated';

export interface ProcessingStep {
  /** Stable list key; processor ids are only allocated when the unit is saved. */
  key: string;
  processor: DraftProcessor;
  status: ProcessingStepStatus;
}

export interface ProcessingFlyoutInput {
  slot: ProcessingNodeRef;
  telemetry: UnitSignal[];
  processors: UnitProcessor[];
  editable: boolean;
  /** Opens the editor for a new processor straight away, e.g. from a line's "Add processing". */
  initialCreate?: { position: ProcessingStepPosition };
  parentRef: AnyActorRef;
}

export interface ProcessingFlyoutContext {
  slot: ProcessingNodeRef;
  telemetry: UnitSignal[];
  editable: boolean;
  steps: ProcessingStep[];
  /** Key of the step open in the editor; `undefined` while creating a new one. */
  editingKey?: string;
  /** Where the processor being created will be inserted. */
  createPosition: ProcessingStepPosition;
  /** Set until the machine has acted on `initialCreate`. */
  initialCreate?: { position: ProcessingStepPosition };
  hasChanges: boolean;
  diagnostics: ProcessingDiagnostic[];
  saveError?: string;
  nextKey: number;
  parentRef: AnyActorRef;
}

export type ProcessingFlyoutEvent =
  | { type: 'step.create'; position?: ProcessingStepPosition }
  | { type: 'step.edit'; key: string }
  | { type: 'step.cancel' }
  | { type: 'step.commit'; processor: DraftProcessor }
  | { type: 'step.delete'; key: string }
  | { type: 'step.deleteAll' }
  | { type: 'step.duplicate'; key: string }
  | { type: 'step.changeDescription'; key: string; description: string }
  | { type: 'step.reorder'; from: number; to: number }
  | { type: 'flyout.save' }
  | { type: 'save.succeeded' }
  | { type: 'save.failed'; message: string; diagnostics: ProcessingDiagnostic[] };

/** Sent to the canvas machine, which applies the draft to the unit and persists it. */
export interface ProcessingSaveRequest {
  type: 'processing.save';
  slot: ProcessingNodeRef;
  processors: DraftProcessor[];
}

const toDraft = ({
  id,
  type,
  name,
  description,
  supported_telemetry: telemetry,
  config,
}: UnitProcessor): DraftProcessor => ({
  id,
  type,
  ...(name ? { name } : {}),
  ...(description ? { description } : {}),
  supported_telemetry: [...telemetry],
  config: [...(config ?? [])],
});

export const processingFlyoutMachine = setup({
  types: {
    input: {} as ProcessingFlyoutInput,
    context: {} as ProcessingFlyoutContext,
    events: {} as ProcessingFlyoutEvent,
  },
  actions: {
    openEditor: assign((_, params: { key?: string }) => ({ editingKey: params.key })),
    openCreator: assign((_, params: { position?: ProcessingStepPosition }) => ({
      editingKey: undefined,
      createPosition: params.position ?? SLOT_POSITION.end,
      initialCreate: undefined,
    })),
    closeEditor: assign({ editingKey: undefined }),
    commitStep: assign(({ context, event }) => {
      if (event.type !== 'step.commit') {
        return {};
      }
      const { editingKey } = context;
      const existing = context.steps.find(({ key }) => key === editingKey);
      if (!existing) {
        const created: ProcessingStep = {
          key: `step-${context.nextKey}`,
          processor: event.processor,
          status: 'new',
        };
        return {
          steps:
            context.createPosition === SLOT_POSITION.start
              ? [created, ...context.steps]
              : [...context.steps, created],
          nextKey: context.nextKey + 1,
          editingKey: undefined,
          hasChanges: true,
        };
      }
      return {
        steps: context.steps.map((step) =>
          step.key === existing.key
            ? {
                ...step,
                processor: { ...event.processor, id: step.processor.id },
                status: step.status === 'new' ? ('new' as const) : ('updated' as const),
              }
            : step
        ),
        editingKey: undefined,
        hasChanges: true,
      };
    }),
    deleteStep: assign(({ context, event }) =>
      event.type === 'step.delete'
        ? {
            steps: context.steps.filter(({ key }) => key !== event.key),
            editingKey: context.editingKey === event.key ? undefined : context.editingKey,
            hasChanges: true,
          }
        : {}
    ),
    deleteAllSteps: assign({ steps: [], editingKey: undefined, hasChanges: true }),
    duplicateStep: assign(({ context, event }) => {
      if (event.type !== 'step.duplicate') {
        return {};
      }
      const index = context.steps.findIndex(({ key }) => key === event.key);
      const original = context.steps[index];
      if (!original) {
        return {};
      }
      const steps = [...context.steps];
      steps.splice(index + 1, 0, {
        key: `step-${context.nextKey}`,
        processor: omit(original.processor, 'id'),
        status: 'new',
      });
      return { steps, nextKey: context.nextKey + 1, hasChanges: true };
    }),
    changeDescription: assign(({ context, event }) => {
      if (event.type !== 'step.changeDescription') {
        return {};
      }
      return {
        steps: context.steps.map((step) => {
          if (step.key !== event.key) {
            return step;
          }
          const processor = omit(step.processor, 'description');
          return {
            ...step,
            processor: event.description
              ? { ...processor, description: event.description }
              : processor,
            status: step.status === 'new' ? ('new' as const) : ('updated' as const),
          };
        }),
        hasChanges: true,
      };
    }),
    reorderStep: assign(({ context, event }) => {
      if (event.type !== 'step.reorder' || event.from === event.to) {
        return {};
      }
      const steps = [...context.steps];
      const [moved] = steps.splice(event.from, 1);
      if (!moved) {
        return {};
      }
      steps.splice(event.to, 0, moved);
      return { steps, hasChanges: true };
    }),
    clearSaveFeedback: assign({ diagnostics: [], saveError: undefined }),
    storeSaveFailure: assign(({ event }) =>
      event.type === 'save.failed'
        ? { saveError: event.message, diagnostics: event.diagnostics }
        : {}
    ),
    requestSave: sendTo(
      ({ context }) => context.parentRef,
      ({ context }): ProcessingSaveRequest => ({
        type: 'processing.save',
        slot: context.slot,
        processors: context.steps.map(({ processor }) => processor),
      })
    ),
  },
  guards: {
    canSave: ({ context }) => context.editable && context.hasChanges,
    canDeleteAll: ({ context }) => context.editable && context.steps.length > 0,
    shouldStartCreating: ({ context }) => context.editable && context.initialCreate !== undefined,
    isEditingDeletedStep: ({ context, event }) =>
      event.type === 'step.delete' && event.key === context.editingKey,
  },
}).createMachine({
  id: 'processingFlyout',
  context: ({ input }) => ({
    slot: input.slot,
    telemetry: input.telemetry,
    editable: input.editable,
    steps: input.processors.map((processor, index) => ({
      key: `step-${index}`,
      processor: toDraft(processor),
      status: 'saved' as const,
    })),
    editingKey: undefined,
    createPosition: SLOT_POSITION.end,
    initialCreate: input.initialCreate,
    hasChanges: false,
    diagnostics: [],
    saveError: undefined,
    nextKey: input.processors.length,
    parentRef: input.parentRef,
  }),
  initial: 'starting',
  states: {
    starting: {
      always: [
        {
          guard: 'shouldStartCreating',
          target: 'editing',
          actions: {
            type: 'openCreator',
            params: ({ context }) => ({ position: context.initialCreate?.position }),
          },
        },
        { target: 'idle' },
      ],
    },
    idle: {
      on: {
        'step.create': {
          guard: ({ context }) => context.editable,
          target: 'editing',
          actions: {
            type: 'openCreator',
            params: ({ event }) => ({ position: event.position }),
          },
        },
        'step.edit': {
          guard: ({ context }) => context.editable,
          target: 'editing',
          actions: { type: 'openEditor', params: ({ event }) => ({ key: event.key }) },
        },
        'step.delete': { actions: 'deleteStep' },
        'step.deleteAll': { guard: 'canDeleteAll', actions: 'deleteAllSteps' },
        'step.duplicate': {
          guard: ({ context }) => context.editable,
          actions: 'duplicateStep',
        },
        'step.changeDescription': {
          guard: ({ context }) => context.editable,
          actions: 'changeDescription',
        },
        'step.reorder': { actions: 'reorderStep' },
        'flyout.save': {
          guard: 'canSave',
          target: 'saving',
        },
      },
    },
    editing: {
      on: {
        'step.commit': { target: 'idle', actions: 'commitStep' },
        'step.cancel': { target: 'idle', actions: 'closeEditor' },
        'step.delete': [
          { guard: 'isEditingDeletedStep', target: 'idle', actions: 'deleteStep' },
          { actions: 'deleteStep' },
        ],
        'step.deleteAll': { guard: 'canDeleteAll', target: 'idle', actions: 'deleteAllSteps' },
        'step.reorder': { actions: 'reorderStep' },
        'step.edit': {
          actions: { type: 'openEditor', params: ({ event }) => ({ key: event.key }) },
        },
        'step.create': {
          actions: { type: 'openCreator', params: ({ event }) => ({ position: event.position }) },
        },
      },
    },
    saving: {
      entry: ['clearSaveFeedback', 'requestSave'],
      on: {
        'save.succeeded': { target: 'saved' },
        'save.failed': { target: 'idle', actions: 'storeSaveFailure' },
      },
    },
    saved: {
      type: 'final',
    },
  },
});

export type ProcessingFlyoutActorRef = ActorRefFrom<typeof processingFlyoutMachine>;

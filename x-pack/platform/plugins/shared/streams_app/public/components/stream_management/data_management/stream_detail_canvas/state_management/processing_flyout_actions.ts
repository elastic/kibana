/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AnyActorRef } from 'xstate';
import type {
  ProcessingFlyoutInput,
  ProcessingSaveRequest,
} from '../../../../stream_processing_flyout/state_management/processing_flyout_machine';
import { getProcessingDiagnostics } from '../../../../../services/unit_diagnostics';
import {
  PROCESSING_DRAFT_FAILURE,
  applyProcessingDraft,
  getProcessingNodeProcessors,
  getProcessingSlotTelemetry,
  type ProcessingDraftResult,
} from '../../../../../services/unit_processing';
import {
  PROCESSING_SLOT_KIND,
  isProcessingSlotEditable,
  type UnitLine,
} from '../../../../../services/unit_graph';
import { isolateSourceLine } from '../../../../../services/unit_connections';
import type { Unit } from '../../../../../services/unit_repository';
import { getFormattedError } from '../../../../../util/errors';
import type { CanvasState, CanvasUrlEvent } from './types';

/**
 * How the canvas machine opens, saves and closes the processing flyout. The
 * flyout only edits a draft; the canvas applies it to the unit and persists it.
 */

export const PROCESSING_FLYOUT_ID = 'processingFlyout';

interface CanvasActionArgs {
  context: CanvasState;
  event: CanvasUrlEvent;
}

type ProcessingOpenEvent = Extract<CanvasUrlEvent, { type: 'processing.open' }>;

export interface ProcessingFlyoutOpening {
  input: ProcessingFlyoutInput;
  /** Set when the flyout edits the pipeline a shared source line moves onto when it saves. */
  line?: UnitLine;
}

/**
 * The flyout's input for an existing slot, or for the pipeline a shared source
 * line moves onto. Moving the line is only previewed here; it is staged on save.
 */
export const getProcessingFlyoutOpening = (
  unit: Unit,
  event: ProcessingOpenEvent,
  parentRef: AnyActorRef
): ProcessingFlyoutOpening | undefined => {
  if (!('line' in event)) {
    const { slot, position } = event;
    return {
      input: {
        slot,
        telemetry: getProcessingSlotTelemetry(unit, slot),
        processors: getProcessingNodeProcessors(unit, slot),
        editable: isProcessingSlotEditable(unit, slot),
        initialCreate: position ? { position } : undefined,
        parentRef,
      },
    };
  }
  const { line } = event;
  const isolated = isolateSourceLine(unit, line.sourceId, line.destinationId);
  if (!isolated) {
    return undefined;
  }
  const slot = { kind: PROCESSING_SLOT_KIND.pipeline, pipelineId: isolated.pipelineId };
  return {
    line,
    input: {
      slot,
      telemetry: getProcessingSlotTelemetry(isolated.unit, slot),
      processors: getProcessingNodeProcessors(isolated.unit, slot),
      editable: isProcessingSlotEditable(isolated.unit, slot),
      parentRef,
    },
  };
};

/** Applies a flyout save, first moving a shared source line onto the pipeline the flyout edits. */
const draftProcessingSave = (
  context: CanvasState,
  { slot, processors }: ProcessingSaveRequest
): ProcessingDraftResult => {
  const line = context.processingFlyout?.line;
  if (!line) {
    return applyProcessingDraft(context.nextUnit, slot, processors);
  }
  const isolated = isolateSourceLine(context.nextUnit, line.sourceId, line.destinationId);
  if (
    !isolated ||
    slot.kind !== PROCESSING_SLOT_KIND.pipeline ||
    slot.pipelineId !== isolated.pipelineId
  ) {
    return { ok: false, reason: PROCESSING_DRAFT_FAILURE.missingSlot };
  }
  return applyProcessingDraft(isolated.unit, slot, processors);
};

/** The guard and the action of one `processing.save` transition receive the same event. */
const draftsBySaveEvent = new WeakMap<ProcessingSaveRequest, ProcessingDraftResult>();

const getProcessingDraft = (
  context: CanvasState,
  event: ProcessingSaveRequest
): ProcessingDraftResult => {
  const cached = draftsBySaveEvent.get(event);
  if (cached) {
    return cached;
  }
  const result = draftProcessingSave(context, event);
  draftsBySaveEvent.set(event, result);
  return result;
};

/** Stages the drafted unit as the one being saved, remembering what to restore on failure. */
export const getProcessingSaveUpdate = ({
  context,
  event,
}: CanvasActionArgs): Partial<CanvasState> => {
  if (event.type !== 'processing.save') {
    return {};
  }
  const result = getProcessingDraft(context, event);
  // Unreachable: `canApplyProcessingDraft` only lets drafts that applied through.
  if (!result.ok) {
    return {};
  }
  const { unit: nextUnit, processorIds } = result;
  return {
    nextUnit,
    savingUnit: nextUnit,
    savingComponentIds: undefined,
    savingComponentKind: undefined,
    savingComponentIntent: 'processing',
    savingSecrets: undefined,
    processingRollbackUnit: context.nextUnit,
    processingSaveIds: processorIds,
    error: undefined,
  };
};

export const getProcessingRollbackUpdate = ({
  context,
}: CanvasActionArgs): Partial<CanvasState> => ({
  nextUnit: context.processingRollbackUnit ?? context.unit,
  savingUnit: undefined,
  savingComponentIntent: undefined,
  processingRollbackUnit: undefined,
  processingSaveIds: undefined,
});

// The flyout may have been closed while its save was in flight, so these only
// reply when it is still open.
export const notifyProcessingSaved = ({ context }: CanvasActionArgs): void => {
  context.processingFlyout?.ref.send({ type: 'save.succeeded' });
};

export const notifyProcessingSaveFailed = ({ context, event }: CanvasActionArgs): void => {
  if (!context.processingFlyout) {
    return;
  }
  const error =
    event.type === 'xstate.error.actor.validateUnitDefinition' ||
    event.type === 'xstate.error.actor.persistUnitDefinition'
      ? event.error
      : undefined;
  const saveIds = context.processingSaveIds ?? [];
  context.processingFlyout.ref.send({
    type: 'save.failed',
    message: getFormattedError(error).message,
    diagnostics: getProcessingDiagnostics(error, context.savingUnit ?? context.nextUnit).map(
      (diagnostic) => {
        const stepIndex = diagnostic.processorId ? saveIds.indexOf(diagnostic.processorId) : -1;
        return stepIndex === -1 ? diagnostic : { ...diagnostic, stepIndex };
      }
    ),
  });
};

export const rejectMissingSlotProcessingSave = ({ context }: CanvasActionArgs): void => {
  context.processingFlyout?.ref.send({
    type: 'save.failed',
    message: i18n.translate('xpack.streams.streamDetailCanvas.processingSlotMissingMessage', {
      defaultMessage:
        'This processing no longer exists in the configuration. Close the flyout and try again.',
    }),
    diagnostics: [],
  });
};

export const rejectBusyProcessingSave = ({ context }: CanvasActionArgs): void => {
  context.processingFlyout?.ref.send({
    type: 'save.failed',
    message: i18n.translate('xpack.streams.streamDetailCanvas.processingSaveBusyMessage', {
      defaultMessage: 'The configuration is still loading or saving. Try again in a moment.',
    }),
    diagnostics: [],
  });
};

export const isSavingProcessing = ({ context }: CanvasActionArgs): boolean =>
  context.savingComponentIntent === 'processing';

export const canApplyProcessingDraft = ({ context, event }: CanvasActionArgs): boolean =>
  event.type === 'processing.save' && getProcessingDraft(context, event).ok;

export const processingSavedToastTitle = i18n.translate(
  'xpack.streams.streamDetailCanvas.processingSavedSuccessTitle',
  { defaultMessage: 'Processing saved and applied' }
);

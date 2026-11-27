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
import { sharedProcessingUnsavedMessage } from '../../../../stream_processing_flyout/prompt_options';
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
import {
  isProcessingSlotSaved,
  PROCESSING_TRANSPLANT_FAILURE,
  transplantProcessingDraft,
  type ProcessingTransplantFailure,
} from '../../../../../services/unit_component_save';
import { usedComponentIds } from '../../../../../services/unit_pipeline';
import {
  findSourceLinePipelineId,
  isolateSourceLine,
} from '../../../../../services/unit_connections';
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
  parentRef: AnyActorRef,
  reservedIds?: ReadonlySet<string>
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
  const isolated = isolateSourceLine(unit, line.sourceId, line.destinationId, reservedIds);
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
  const reservedIds = usedComponentIds(context.unit);
  if (!line) {
    return applyProcessingDraft(context.nextUnit, slot, processors, reservedIds);
  }
  const isolated = isolateSourceLine(
    context.nextUnit,
    line.sourceId,
    line.destinationId,
    reservedIds
  );
  if (
    !isolated ||
    slot.kind !== PROCESSING_SLOT_KIND.pipeline ||
    slot.pipelineId !== isolated.pipelineId
  ) {
    return { ok: false, reason: PROCESSING_DRAFT_FAILURE.missingSlot };
  }
  return processors.length === 0
    ? { ok: true, unit: context.nextUnit, processorIds: [] }
    : applyProcessingDraft(isolated.unit, slot, processors, reservedIds);
};

type ProcessingSaveResult =
  | { ok: true; staged: Unit; persisted: Unit; processorIds: string[] }
  | { ok: false; reason: 'missing_slot' | ProcessingTransplantFailure };

const prepareProcessing = (
  context: CanvasState,
  event: ProcessingSaveRequest
): ProcessingSaveResult => {
  const target = context.processingFlyout;
  if (!target) return { ok: false, reason: 'missing_slot' };
  if (!isProcessingSlotSaved(context.unit, context.nextUnit, target)) {
    const exists = target.line
      ? findSourceLinePipelineId(
          context.nextUnit,
          target.line.sourceId,
          target.line.destinationId
        ) !== undefined
      : isProcessingSlotEditable(context.nextUnit, target.slot);
    return { ok: false, reason: exists ? 'unsaved_slot' : 'missing_slot' };
  }
  const draft = draftProcessingSave(context, event);
  if (!draft.ok) return draft;
  const transplant = transplantProcessingDraft({
    persisted: context.unit,
    staged: context.nextUnit,
    drafted: draft.unit,
  });
  if (!transplant.ok) return transplant;
  return {
    ok: true,
    staged: draft.unit,
    persisted: transplant.unit,
    processorIds: draft.processorIds,
  };
};

// Reuse the prepared save across guards and actions for the same event.
const savesByEvent = new WeakMap<ProcessingSaveRequest, ProcessingSaveResult>();
const getProcessingSave = (
  context: CanvasState,
  event: ProcessingSaveRequest
): ProcessingSaveResult => {
  const cached = savesByEvent.get(event);
  if (cached) return cached;
  const result = prepareProcessing(context, event);
  savesByEvent.set(event, result);
  return result;
};

export const getProcessingSaveUpdate = ({
  context,
  event,
}: CanvasActionArgs): Partial<CanvasState> => {
  if (event.type !== 'processing.save') {
    return {};
  }
  const result = getProcessingSave(context, event);
  if (!result.ok) return {};
  const { staged: nextUnit, persisted: savingUnit, processorIds } = result;
  return {
    nextUnit,
    savingUnit,
    savingStagedUnit: nextUnit,
    savingComponentIds: undefined,
    savingComponentKind: undefined,
    savingComponentIntent: 'processing',
    savingSecrets: undefined,
    stagedRollbackUnit: context.nextUnit,
    processingRollbackNodePositions: context.nodePositions,
    processingSaveIds: processorIds,
    error: undefined,
  };
};

export const getProcessingRollbackUpdate = ({
  context,
}: CanvasActionArgs): Partial<CanvasState> => ({
  nextUnit: context.stagedRollbackUnit ?? context.unit,
  // The canvas tidies the flow a new processing node joins as the save starts.
  nodePositions: context.processingRollbackNodePositions ?? context.nodePositions,
  savingUnit: undefined,
  savingStagedUnit: undefined,
  savingComponentIntent: undefined,
  stagedRollbackUnit: undefined,
  processingRollbackNodePositions: undefined,
  processingSaveIds: undefined,
});

// The flyout can close while a save is in flight.
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

export const isProcessingDraftOnSavedSlot = ({ context, event }: CanvasActionArgs): boolean =>
  event.type === 'processing.save' && getProcessingSave(context, event).ok;

export const isUnsavedProcessingSlot = ({ context, event }: CanvasActionArgs): boolean => {
  if (event.type !== 'processing.save') return false;
  const result = getProcessingSave(context, event);
  return !result.ok && result.reason !== PROCESSING_DRAFT_FAILURE.missingSlot;
};

export const processingSlotUnsavedMessage = i18n.translate(
  'xpack.streams.streamDetailCanvas.processingSlotUnsavedMessage',
  {
    defaultMessage:
      "This processing is on a connection you haven't saved yet. Save the map, then apply the processing.",
  }
);

export const rejectUnsavedSlotProcessingSave = ({ context, event }: CanvasActionArgs): void => {
  if (event.type !== 'processing.save') return;
  const result = getProcessingSave(context, event);
  if (result.ok) return;
  context.processingFlyout?.ref.send({
    type: 'save.failed',
    message:
      result.reason === PROCESSING_TRANSPLANT_FAILURE.sharedProcessor
        ? sharedProcessingUnsavedMessage
        : processingSlotUnsavedMessage,
    diagnostics: [],
  });
};

export const processingSavedToastTitle = i18n.translate(
  'xpack.streams.streamDetailCanvas.processingSavedSuccessTitle',
  { defaultMessage: 'Processing saved and applied' }
);

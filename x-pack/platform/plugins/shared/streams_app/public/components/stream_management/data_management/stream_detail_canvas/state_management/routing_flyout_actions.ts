/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AnyActorRef } from 'xstate';
import {
  type RoutingFlyoutInput,
  type RoutingFlyoutTarget,
  type RoutingSaveRequest,
} from '../../../../stream_routing_flyout/state_management/routing_flyout_machine';
import {
  canEditPipelineRoutes,
  canRouteLine,
  getNewRoutingRules,
  getPipelineRoutes,
  getPipelineRoutingSignals,
  getRoutableLineSignals,
  routeLine,
  writePipelineRoutes,
} from '../../../../../services/unit_connections';
import type { Unit } from '../../../../../services/unit_repository';
import {
  getRoutingDiagnostics,
  type RoutingDiagnostic,
} from '../../../../../services/unit_diagnostics';
import type { CanvasState, CanvasUrlEvent } from './types';

/**
 * How the canvas machine opens, stages and closes the routing flyout. The flyout
 * only edits a draft of the rules; the canvas stages them on the unit. Nothing
 * is persisted until the canvas is saved, since new rules still need targets.
 */

export const ROUTING_FLYOUT_ID = 'routingFlyout';

interface CanvasActionArgs {
  context: CanvasState;
  event: CanvasUrlEvent;
}

/**
 * The flyout's input for a new routing node on a line, or for an existing routing
 * node. Undefined when the target cannot be configured.
 */
export const getRoutingFlyoutInput = (
  unit: Unit,
  target: RoutingFlyoutTarget,
  parentRef: AnyActorRef,
  readOnly = false,
  diagnostics: readonly RoutingDiagnostic[] = []
): RoutingFlyoutInput | undefined => {
  if (target.kind === 'pipeline') {
    const rules = getPipelineRoutes(unit, target.pipelineId);
    const { current, available } = getPipelineRoutingSignals(unit, target.pipelineId);
    return rules.length > 0
      ? {
          target,
          rules,
          signals: current,
          availableSignals: available,
          editable: canEditPipelineRoutes(unit, target.pipelineId),
          readOnly,
          diagnostics: diagnostics.filter(({ pipelineId }) => pipelineId === target.pipelineId),
          parentRef,
        }
      : undefined;
  }
  if (!canRouteLine(unit, target.line)) {
    return undefined;
  }
  const { current, available } = getRoutableLineSignals(unit, target.line);
  return {
    target,
    rules: getNewRoutingRules(unit, target.line),
    signals: current,
    availableSignals: available,
    editable: true,
    readOnly,
    parentRef,
  };
};

const draftRoutingSave = (
  unit: Unit,
  { target, rules, supportedTelemetry }: RoutingSaveRequest
): Unit =>
  target.kind === 'line'
    ? routeLine(unit, target.line, rules, supportedTelemetry)
    : writePipelineRoutes(unit, target.pipelineId, rules, supportedTelemetry);

/** The guard and the action of one `routing.save` transition receive the same event. */
const draftsBySaveEvent = new WeakMap<RoutingSaveRequest, Unit>();

const getRoutingDraft = (context: CanvasState, event: RoutingSaveRequest): Unit => {
  const cached = draftsBySaveEvent.get(event);
  if (cached) {
    return cached;
  }
  const result = draftRoutingSave(context.nextUnit, event);
  draftsBySaveEvent.set(event, result);
  return result;
};

export const canApplyRoutingDraft = ({ context, event }: CanvasActionArgs): boolean =>
  event.type === 'routing.save' && getRoutingDraft(context, event) !== context.nextUnit;

/**
 * Stages the drafted unit; it is persisted with the rest of the canvas on save. The
 * routing node's diagnostics from the last failed save no longer apply to its new rules.
 */
export const getRoutingStageUpdate = ({
  context,
  event,
}: CanvasActionArgs): Partial<CanvasState> => {
  if (event.type !== 'routing.save') {
    return {};
  }
  const { target } = event;
  return {
    nextUnit: getRoutingDraft(context, event),
    error: undefined,
    routingDiagnostics:
      target.kind === 'pipeline'
        ? context.routingDiagnostics?.filter(({ pipelineId }) => pipelineId !== target.pipelineId)
        : context.routingDiagnostics,
  };
};

/** Traces the diagnostics of a failed save back to the routing nodes of the unit that was saving. */
export const getRoutingDiagnosticsUpdate = ({
  context,
  event,
}: CanvasActionArgs): Partial<CanvasState> =>
  event.type === 'xstate.error.actor.validateUnitDefinition' ||
  event.type === 'xstate.error.actor.persistUnitDefinition'
    ? {
        routingDiagnostics: getRoutingDiagnostics(
          event.error,
          context.savingUnit ?? context.nextUnit
        ),
      }
    : {};

export const notifyRoutingStaged = ({ context }: CanvasActionArgs): void => {
  context.routingFlyout?.ref?.send({ type: 'save.succeeded' });
};

export const rejectMissingRoutingSave = ({ context }: CanvasActionArgs): void => {
  context.routingFlyout?.ref?.send({
    type: 'save.failed',
    message: i18n.translate('xpack.streams.streamDetailCanvas.routingTargetMissingMessage', {
      defaultMessage:
        'This routing can no longer be applied to the configuration. Close the flyout and try again.',
    }),
  });
};

export const rejectBusyRoutingSave = ({ context }: CanvasActionArgs): void => {
  context.routingFlyout?.ref?.send({
    type: 'save.failed',
    message: i18n.translate('xpack.streams.streamDetailCanvas.routingSaveBusyMessage', {
      defaultMessage: 'The configuration is still saving. Try again in a moment.',
    }),
  });
};

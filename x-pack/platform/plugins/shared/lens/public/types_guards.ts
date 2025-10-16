/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isLensFilterEvent(event: ExpressionRendererEvent): event is ClickTriggerEvent {
  return event.name === 'filter';
}

export function isLensMultiFilterEvent(
  event: ExpressionRendererEvent
): event is MultiClickTriggerEvent {
  return event.name === 'multiFilter';
}

export function isLensBrushEvent(event: ExpressionRendererEvent): event is BrushTriggerEvent {
  return event.name === 'brush';
}

export function isLensEditEvent<T extends LensEditSupportedActions>(
  event: ExpressionRendererEvent
): event is LensEditEvent<T> {
  return event.name === 'edit';
}

export function isLensTableRowContextMenuClickEvent(
  event: ExpressionRendererEvent
): event is LensTableRowContextMenuEvent {
  return event.name === 'tableRowContextMenuClick';
}

export function isLensAlertRule(event: ExpressionRendererEvent): event is LensAlertRulesEvent {
  return event.name === 'alertRule';
}

export function isOperation(operationCandidate: unknown): operationCandidate is DragDropOperation {
  return (
    typeof operationCandidate === 'object' &&
    operationCandidate !== null &&
    'columnId' in operationCandidate
  );
}

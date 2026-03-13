/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/**
 * Source of a Cases domain event. Used for recursion prevention in the workflow bridge.
 */
export type CasesEventSource = 'api' | 'workflowStep' | 'connector' | 'system';

/**
 * Base metadata carried with every Cases domain event for routing and recursion control.
 */
export interface CasesEventMetadata {
  readonly request: KibanaRequest;
  readonly spaceId: string;
  readonly source: CasesEventSource;
}

/**
 * Event: case created
 */
export interface CaseCreatedEventPayload {
  readonly case: Record<string, unknown>;
}

/**
 * Event: case updated
 */
export interface CaseUpdatedEventPayload {
  readonly case: Record<string, unknown>;
  readonly updatedFields?: string[];
}

/**
 * Event: comment added
 */
export interface CommentAddedEventPayload {
  readonly case: Record<string, unknown>;
  readonly commentType: string;
}

export type CasesDomainEventPayload =
  | { type: 'caseCreated'; payload: CaseCreatedEventPayload }
  | { type: 'caseUpdated'; payload: CaseUpdatedEventPayload }
  | { type: 'commentAdded'; payload: CommentAddedEventPayload };

export type CasesEventPayload = CasesDomainEventPayload & { metadata: CasesEventMetadata };

export function isCaseCreatedEvent(
  event: CasesEventPayload
): event is CasesEventPayload & { type: 'caseCreated' } {
  return event.type === 'caseCreated';
}

export function isCaseUpdatedEvent(
  event: CasesEventPayload
): event is CasesEventPayload & { type: 'caseUpdated' } {
  return event.type === 'caseUpdated';
}

export function isCommentAddedEvent(
  event: CasesEventPayload
): event is CasesEventPayload & { type: 'commentAdded' } {
  return event.type === 'commentAdded';
}

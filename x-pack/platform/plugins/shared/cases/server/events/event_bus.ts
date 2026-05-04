/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';

import type { KibanaRequest } from '@kbn/core/server';
import type {
  CasesEventPayload,
  CasesDomainEventType,
  CaseCreatedEventPayload,
  CaseUpdatedEventPayload,
  CommentAddedEventPayload,
} from './types';

export const CASE_CREATED_EVENT = 'caseCreated';
export const CASE_UPDATED_EVENT = 'caseUpdated';
export const COMMENT_ADDED_EVENT = 'commentAdded';

export type CasesEventName =
  | typeof CASE_CREATED_EVENT
  | typeof CASE_UPDATED_EVENT
  | typeof COMMENT_ADDED_EVENT;

export type CasesEventBusListener<TType extends CasesDomainEventType = CasesDomainEventType> = (
  event: CasesEventPayload<TType>
) => void | Promise<void>;

/**
 * Typed internal event bus for Cases domain events.
 * Replaces direct client-to-workflows emission with a single bridge listener.
 */
export class CasesEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitCaseCreated(request: KibanaRequest, payload: CaseCreatedEventPayload): void {
    this.emit(CASE_CREATED_EVENT, { type: 'caseCreated', payload, request });
  }

  emitCaseUpdated(request: KibanaRequest, payload: CaseUpdatedEventPayload): void {
    this.emit(CASE_UPDATED_EVENT, { type: 'caseUpdated', payload, request });
  }

  emitCommentAdded(request: KibanaRequest, payload: CommentAddedEventPayload): void {
    this.emit(COMMENT_ADDED_EVENT, { type: 'commentAdded', payload, request });
  }

  onCaseCreated(listener: CasesEventBusListener<'caseCreated'>): void {
    this.on(CASE_CREATED_EVENT, listener);
  }

  onCaseUpdated(listener: CasesEventBusListener<'caseUpdated'>): void {
    this.on(CASE_UPDATED_EVENT, listener);
  }

  onCommentAdded(listener: CasesEventBusListener<'commentAdded'>): void {
    this.on(COMMENT_ADDED_EVENT, listener);
  }

  removeCaseCreatedListener(listener: CasesEventBusListener<'caseCreated'>): void {
    this.off(CASE_CREATED_EVENT, listener);
  }

  removeCaseUpdatedListener(listener: CasesEventBusListener<'caseUpdated'>): void {
    this.off(CASE_UPDATED_EVENT, listener);
  }

  removeCommentAddedListener(listener: CasesEventBusListener<'commentAdded'>): void {
    this.off(COMMENT_ADDED_EVENT, listener);
  }
}

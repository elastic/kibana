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
  AttachmentsAddedEventPayload,
} from './types';

export const CASE_CREATED_EVENT = 'caseCreated';
export const CASE_UPDATED_EVENT = 'caseUpdated';
export const ATTACHMENTS_ADDED_EVENT = 'attachmentsAdded';

export type CasesEventName =
  | typeof CASE_CREATED_EVENT
  | typeof CASE_UPDATED_EVENT
  | typeof ATTACHMENTS_ADDED_EVENT;

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

  emitAttachmentsAdded(request: KibanaRequest, payload: AttachmentsAddedEventPayload): void {
    this.emit(ATTACHMENTS_ADDED_EVENT, { type: 'attachmentsAdded', payload, request });
  }

  onCaseCreated(listener: CasesEventBusListener<'caseCreated'>): void {
    this.on(CASE_CREATED_EVENT, listener);
  }

  onCaseUpdated(listener: CasesEventBusListener<'caseUpdated'>): void {
    this.on(CASE_UPDATED_EVENT, listener);
  }

  onAttachmentsAdded(listener: CasesEventBusListener<'attachmentsAdded'>): void {
    this.on(ATTACHMENTS_ADDED_EVENT, listener);
  }

  removeCaseCreatedListener(listener: CasesEventBusListener<'caseCreated'>): void {
    this.off(CASE_CREATED_EVENT, listener);
  }

  removeCaseUpdatedListener(listener: CasesEventBusListener<'caseUpdated'>): void {
    this.off(CASE_UPDATED_EVENT, listener);
  }

  removeAttachmentsAddedListener(listener: CasesEventBusListener<'attachmentsAdded'>): void {
    this.off(ATTACHMENTS_ADDED_EVENT, listener);
  }
}

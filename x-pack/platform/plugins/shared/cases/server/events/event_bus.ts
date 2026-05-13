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
import type { Case } from '../../common';
import type { CaseSavedObjectTransformed } from '../common/types/case';

export const CASE_CREATED_EVENT = 'caseCreated';
export const CASE_UPDATED_EVENT = 'caseUpdated';
export const ATTACHMENTS_ADDED_EVENT = 'attachmentsAdded';
export const CASE_STATUS_CHANGED_EVENT = 'caseStatusChanged';

interface CaseUpdatedExtraInfo {
  previousCase?: CaseSavedObjectTransformed;
  updatedCase?: Case;
}

export type CasesEventBusListener<TType extends CasesDomainEventType = CasesDomainEventType> = (
  event: CasesEventPayload<TType>
) => void | Promise<void>;

export type CaseUpdatedEventBusListener<TType extends CasesDomainEventType = CasesDomainEventType> =
  (event: CasesEventPayload<TType>, extraInfo: CaseUpdatedExtraInfo) => void | Promise<void>;

/**
 * Typed internal event bus for Cases domain events.
 * Replaces direct client-to-workflows emission with a single bridge listener.
 */
export class CasesEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitCaseCreated(request: KibanaRequest, payload: CaseCreatedEventPayload) {
    this.emit(CASE_CREATED_EVENT, { type: 'caseCreated', payload, request });
  }

  emitCaseUpdated(
    request: KibanaRequest,
    payload: CaseUpdatedEventPayload,
    extraInfo: CaseUpdatedExtraInfo
  ) {
    this.emit(CASE_UPDATED_EVENT, { type: 'caseUpdated', payload, request }, extraInfo);
  }

  emitAttachmentsAdded(request: KibanaRequest, payload: AttachmentsAddedEventPayload) {
    this.emit(ATTACHMENTS_ADDED_EVENT, { type: 'attachmentsAdded', payload, request });
  }

  onCaseCreated(listener: CasesEventBusListener<'caseCreated'>) {
    this.on(CASE_CREATED_EVENT, listener);
  }

  onCaseUpdated(listener: CaseUpdatedEventBusListener<'caseUpdated'>) {
    this.on(CASE_UPDATED_EVENT, listener);
  }

  onAttachmentsAdded(listener: CasesEventBusListener<'attachmentsAdded'>) {
    this.on(ATTACHMENTS_ADDED_EVENT, listener);
  }
}

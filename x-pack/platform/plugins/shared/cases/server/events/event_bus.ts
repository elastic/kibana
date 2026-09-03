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
  ObservablesAddedEventPayload,
  AlertStatusChangedEventPayload,
} from './types';
import type { Case } from '../../common';
import type { CaseSavedObjectTransformed } from '../common/types/case';

export const CASE_CREATED_EVENT = 'caseCreated';
export const CASE_UPDATED_EVENT = 'caseUpdated';
export const ATTACHMENTS_ADDED_EVENT = 'attachmentsAdded';
export const OBSERVABLES_ADDED_EVENT = 'observablesAdded';
export const CASE_STATUS_CHANGED_EVENT = 'caseStatusChanged';
export const ALERT_STATUS_CHANGED_EVENT = 'alertStatusChanged';

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

  emitObservablesAdded(request: KibanaRequest, payload: ObservablesAddedEventPayload) {
    this.emit(OBSERVABLES_ADDED_EVENT, { type: 'observablesAdded', payload, request });
  }

  onCaseCreated(listener: CasesEventBusListener<'caseCreated'>) {
    this.subscribeIsolated(CASE_CREATED_EVENT, listener);
  }

  onCaseUpdated(listener: CaseUpdatedEventBusListener<'caseUpdated'>) {
    this.subscribeIsolated(CASE_UPDATED_EVENT, listener);
  }

  onAttachmentsAdded(listener: CasesEventBusListener<'attachmentsAdded'>) {
    this.subscribeIsolated(ATTACHMENTS_ADDED_EVENT, listener);
  }

  onObservablesAdded(listener: CasesEventBusListener<'observablesAdded'>) {
    this.subscribeIsolated(OBSERVABLES_ADDED_EVENT, listener);
  }

  emitAlertStatusChanged(request: KibanaRequest, payload: AlertStatusChangedEventPayload) {
    this.emit(ALERT_STATUS_CHANGED_EVENT, { type: 'alertStatusChanged', payload, request });
  }

  onAlertStatusChanged(listener: CasesEventBusListener<'alertStatusChanged'>) {
    this.subscribeIsolated(ALERT_STATUS_CHANGED_EVENT, listener);
  }

  /**
   * Registers a listener in an isolated context so that synchronous exceptions
   * do not propagate to the emitter and async rejections do not become
   * unhandled rejections. Later subscribers still receive the event.
   *
   * The variadic signature covers both single-arg listeners (all `on*` methods
   * except `onCaseUpdated`) and multi-arg listeners (`onCaseUpdated` passes
   * both the event and `extraInfo`).
   */
  private subscribeIsolated<TArgs extends unknown[]>(
    eventName: string,
    listener: (...args: TArgs) => void | Promise<void>
  ): void {
    this.on(eventName, (...args: TArgs) => {
      try {
        const result = listener(...args);
        if (result instanceof Promise) {
          // Prevent async listener rejections from becoming unhandled rejections.
          // The Cases mutation has already completed at this point.
          result.catch(() => {});
        }
      } catch {
        // Isolate sync exceptions so later subscribers still receive the event.
      }
    });
  }

  hasAlertStatusChangedListeners(): boolean {
    return this.listenerCount(ALERT_STATUS_CHANGED_EVENT) > 0;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { STATUS_VALUES } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { Owner } from '../../common/constants/types';

/**
 * Event: case created
 */
interface BaseCaseEventPayload {
  readonly owner: Owner;
}

export interface CaseCreatedEventPayload extends BaseCaseEventPayload {
  readonly caseId: string;
}

/**
 * Event: case updated
 */
export interface CaseUpdatedEventPayload extends BaseCaseEventPayload {
  readonly caseId: string;
  readonly updatedFields?: string[];
}

/**
 * Event: case status changed
 */
export interface CaseStatusChangedEventPayload extends BaseCaseEventPayload {
  readonly caseId: string;
  readonly previousStatus: string;
  readonly status: string;
}

/**
 * Event: attachments added
 */
export interface AttachmentsAddedEventPayload extends BaseCaseEventPayload {
  readonly caseId: string;
  readonly attachmentIds: string[];
  readonly attachmentType: string;
}

/**
 * Event: observables added
 *
 * Observable values are deliberately excluded so that users without Cases read
 * access cannot observe case data through workflow triggers or through the
 * trigger-events data stream (which persists every payload).
 */
export interface ObservablesAddedEventPayload extends BaseCaseEventPayload {
  readonly caseId: string;
  /** IDs of the newly-persisted observables, in insertion order. */
  readonly observableIds: string[];
  /** Type keys for the newly-persisted observables, index-aligned with observableIds (observableTypeKeys[i] is the type of observableIds[i]). A type key may repeat when multiple observables of the same type are added in one request. */
  readonly observableTypeKeys: string[];
}

/**
 * Event: alert status changed (emitted by Cases when it updates alert workflow statuses)
 */
export interface AlertStatusChangedEventPayload {
  readonly alertIds: readonly string[];
  readonly status: STATUS_VALUES;
  readonly previousStatuses: ReadonlyArray<{
    readonly id: string;
    readonly previousStatus: STATUS_VALUES;
  }>;
  /** Maps each alert ID to the ES index it lives in — used by consumers to filter by alert owner. */
  readonly alertIdToIndex: Readonly<Record<string, string>>;
  /** Unique ES indices the affected alerts live in — used by consumers to filter by alert owner. */
  readonly indices: readonly string[];
}

interface CasesDomainEventPayloadByType {
  readonly caseCreated: CaseCreatedEventPayload;
  readonly caseUpdated: CaseUpdatedEventPayload;
  readonly caseStatusChanged: CaseStatusChangedEventPayload;
  readonly attachmentsAdded: AttachmentsAddedEventPayload;
  readonly observablesAdded: ObservablesAddedEventPayload;
  readonly alertStatusChanged: AlertStatusChangedEventPayload;
}

export type CasesDomainEventType = keyof CasesDomainEventPayloadByType;

export interface CasesEventPayload<TType extends CasesDomainEventType = CasesDomainEventType> {
  readonly type: TType;
  readonly payload: CasesDomainEventPayloadByType[TType];
  readonly request: KibanaRequest;
}

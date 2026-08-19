/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
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

interface CasesDomainEventPayloadByType {
  readonly caseCreated: CaseCreatedEventPayload;
  readonly caseUpdated: CaseUpdatedEventPayload;
  readonly caseStatusChanged: CaseStatusChangedEventPayload;
  readonly attachmentsAdded: AttachmentsAddedEventPayload;
}

export type CasesDomainEventType = keyof CasesDomainEventPayloadByType;

export interface CasesEventPayload<TType extends CasesDomainEventType = CasesDomainEventType> {
  readonly type: TType;
  readonly payload: CasesDomainEventPayloadByType[TType];
  readonly request: KibanaRequest;
}

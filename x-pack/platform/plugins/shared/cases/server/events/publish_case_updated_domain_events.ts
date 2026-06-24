/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { DomainEventsServiceStart } from '@kbn/core-domain-events-server';
import {
  CASE_UPDATED_EVENT_TYPE,
  CASE_STATUS_CHANGED_EVENT_TYPE,
} from '@kbn/domain-events/events/cases';
import type { Case } from '../../common';
import type { CaseSavedObjectTransformed } from '../common/types/case';
import type { CaseUpdatedEventPayload, CaseStatusChangedEventPayload } from './types';

export interface PublishCaseUpdatedDomainEventsParams {
  domainEvents: DomainEventsServiceStart;
  request: KibanaRequest;
  payload: CaseUpdatedEventPayload;
  previousCase?: CaseSavedObjectTransformed;
  updatedCase?: Case;
}

export const getCaseStatusChangedPayloadIfApplicable = ({
  payload,
  previousCase,
  updatedCase,
}: Pick<PublishCaseUpdatedDomainEventsParams, 'payload' | 'previousCase' | 'updatedCase'>):
  | CaseStatusChangedEventPayload
  | undefined => {
  const { updatedFields } = payload;

  if (!updatedFields?.includes('status') || !previousCase || !updatedCase) {
    return undefined;
  }

  const status = updatedCase.status;
  const previousStatus = previousCase.attributes.status;

  if (!status || !previousStatus || status === previousStatus) {
    return undefined;
  }

  const { caseId, owner } = payload;

  return { caseId, owner, status, previousStatus };
};

export const publishCaseUpdatedDomainEvents = ({
  domainEvents,
  request,
  payload,
  previousCase,
  updatedCase,
}: PublishCaseUpdatedDomainEventsParams): void => {
  domainEvents.publish({
    type: CASE_UPDATED_EVENT_TYPE,
    payload,
    request,
  });

  const caseStatusChangedPayload = getCaseStatusChangedPayloadIfApplicable({
    payload,
    previousCase,
    updatedCase,
  });

  if (caseStatusChangedPayload) {
    domainEvents.publish({
      type: CASE_STATUS_CHANGED_EVENT_TYPE,
      payload: caseStatusChangedPayload,
      request,
    });
  }
};

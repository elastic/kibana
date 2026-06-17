/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { domainEventBus } from '@kbn/domain-events';
import {
  CASE_UPDATED_EVENT_TYPE,
  CASE_STATUS_CHANGED_EVENT_TYPE,
} from '@kbn/domain-events/events/cases';
import { CasesEventBus } from './event_bus';
import {
  getCaseStatusChangedPayloadIfApplicable,
  publishCaseUpdatedDomainEvents,
} from './publish_case_updated_domain_events';

jest.mock('@kbn/domain-events', () => ({
  domainEventBus: {
    publish: jest.fn(),
  },
}));

describe('publishCaseUpdatedDomainEvents', () => {
  const request = httpServerMock.createKibanaRequest();
  const casesEventBus = new CasesEventBus();
  const publishMock = domainEventBus.publish as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(casesEventBus, 'emitCaseUpdated');
  });

  it('publishes caseUpdated only when updated fields do not include a status change', () => {
    publishCaseUpdatedDomainEvents({
      request,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['title'],
      },
      casesEventBus,
    });

    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith({
      type: CASE_UPDATED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['title'],
      },
      request,
    });
    expect(casesEventBus.emitCaseUpdated).toHaveBeenCalledWith(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['title'],
      },
      { previousCase: undefined, updatedCase: undefined }
    );
  });

  it('publishes caseUpdated and caseStatusChanged when status actually changed', () => {
    publishCaseUpdatedDomainEvents({
      request,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['status'],
      },
      previousCase: {
        // @ts-expect-error - test only needs status on attributes
        attributes: { status: 'in-progress' },
      },
      updatedCase: {
        // @ts-expect-error - test only needs status on updated case
        status: 'closed',
      },
      casesEventBus,
    });

    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(publishMock).toHaveBeenNthCalledWith(1, {
      type: CASE_UPDATED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['status'],
      },
      request,
    });
    expect(publishMock).toHaveBeenNthCalledWith(2, {
      type: CASE_STATUS_CHANGED_EVENT_TYPE,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        previousStatus: 'in-progress',
        status: 'closed',
      },
      request,
    });
    expect(casesEventBus.emitCaseUpdated).toHaveBeenCalledWith(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['status'],
      },
      expect.objectContaining({
        previousCase: expect.objectContaining({ attributes: { status: 'in-progress' } }),
        updatedCase: expect.objectContaining({ status: 'closed' }),
      })
    );
  });

  it('does not publish caseStatusChanged when status field is unchanged', () => {
    publishCaseUpdatedDomainEvents({
      request,
      payload: {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['status'],
      },
      previousCase: {
        // @ts-expect-error - test only needs status on attributes
        attributes: { status: 'closed' },
      },
      updatedCase: {
        // @ts-expect-error - test only needs status on updated case
        status: 'closed',
      },
      casesEventBus,
    });

    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: CASE_UPDATED_EVENT_TYPE })
    );
  });
});

describe('getCaseStatusChangedPayloadIfApplicable', () => {
  it('returns undefined when extra case context is missing', () => {
    expect(
      getCaseStatusChangedPayloadIfApplicable({
        payload: {
          caseId: 'case-1',
          owner: 'securitySolution',
          updatedFields: ['status'],
        },
      })
    ).toBeUndefined();
  });
});

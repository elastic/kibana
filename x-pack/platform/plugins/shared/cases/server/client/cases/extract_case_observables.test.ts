/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { Operations } from '../../authorization';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { extractCaseObservables } from './extract_case_observables';
import { extractObservablesFromAlerts } from '../attachments/extract_observables';

jest.mock('../attachments/extract_observables');

const extractObservablesFromAlertsMock = jest.mocked(extractObservablesFromAlerts);

const caseSO = mockCases[0];
const caseWithExtractionOn = {
  ...caseSO,
  attributes: {
    ...caseSO.attributes,
    settings: { ...caseSO.attributes.settings, extractObservables: true },
  },
};
const caseWithExtractionOff = {
  ...caseSO,
  attributes: {
    ...caseSO.attributes,
    settings: { ...caseSO.attributes.settings, extractObservables: false },
  },
};

const newObservable: Observable = {
  id: '5c431380-c6ef-459f-b0fe-1699e978517b',
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value: '1.2.3.4',
  description: null,
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
};

const documents = [
  { id: 'alert-1', index: 'index-1', attached_at: '2026-09-08T00:00:00.000Z' },
  { id: 'alert-2', index: 'index-2', attached_at: '2026-09-08T00:00:00.000Z' },
];

describe('extractCaseObservables', () => {
  const casesClient = createCasesClientMock();
  const clientArgs = createCasesClientMockArgs();
  const { attachmentService, licensingService, caseService } = clientArgs.services;

  beforeEach(() => {
    jest.clearAllMocks();
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    caseService.getCase.mockResolvedValue(caseWithExtractionOn);
    attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([[caseWithExtractionOn.id, { alerts: 2, events: 1, userComments: 3 }]])
    );
    clientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(documents);
  });

  it('throws forbidden and does not read the case when the license is below Platinum', async () => {
    licensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(extractCaseObservables('case-id', clientArgs, casesClient)).rejects.toThrow(
      Boom.forbidden(
        'In order to extract observables for cases, you must be subscribed to an Elastic Platinum license'
      )
    );

    expect(caseService.getCase).not.toHaveBeenCalled();
    expect(licensingService.notifyUsage).not.toHaveBeenCalled();
  });

  it('notifies the license usage when the license is Platinum', async () => {
    extractObservablesFromAlertsMock.mockResolvedValue({
      status: 'no_new_observables',
      alertsRequested: 2,
      alertsFound: 2,
    });

    await extractCaseObservables('case-id', clientArgs, casesClient);

    expect(licensingService.notifyUsage).toHaveBeenCalledWith(LICENSING_CASE_OBSERVABLES_FEATURE);
  });

  it('authorizes the update of the case before it reads the attachments', async () => {
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(Boom.forbidden('not allowed'));

    await expect(extractCaseObservables('case-id', clientArgs, casesClient)).rejects.toThrow(
      'not allowed'
    );

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateCase,
      entities: [{ id: caseWithExtractionOn.id, owner: caseWithExtractionOn.attributes.owner }],
    });
    expect(casesClient.attachments.getAllDocumentsAttachedToCase).not.toHaveBeenCalled();
  });

  it('throws a bad request when extraction is turned off for the case', async () => {
    caseService.getCase.mockResolvedValue(caseWithExtractionOff);

    const error = await extractCaseObservables('case-id', clientArgs, casesClient).catch((e) => e);

    expect(Boom.isBoom(error)).toBe(true);
    expect(error.output.statusCode).toBe(400);
    expect(error.message).toContain('Observable extraction is turned off');
    expect(casesClient.attachments.getAllDocumentsAttachedToCase).not.toHaveBeenCalled();
    expect(extractObservablesFromAlertsMock).not.toHaveBeenCalled();
  });

  it('reports alerts_not_found without a lookup when the case has no alerts or events', async () => {
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([]);

    const res = await extractCaseObservables('case-id', clientArgs, casesClient);

    expect(res).toEqual(
      expect.objectContaining({
        status: 'alerts_not_found',
        newObservablesCount: 0,
        alertsRequested: 0,
        alertsFound: 0,
      })
    );
    expect(extractObservablesFromAlertsMock).not.toHaveBeenCalled();
  });

  it('passes the id and index of every attached document to the extraction core', async () => {
    extractObservablesFromAlertsMock.mockResolvedValue({
      status: 'no_new_observables',
      alertsRequested: 2,
      alertsFound: 2,
    });

    await extractCaseObservables('case-id', clientArgs, casesClient);

    expect(extractObservablesFromAlertsMock).toHaveBeenCalledWith(
      caseWithExtractionOn.id,
      [
        { id: 'alert-1', index: 'index-1' },
        { id: 'alert-2', index: 'index-2' },
      ],
      clientArgs
    );
  });

  it('returns the patched case, the count, and emits the event when observables were saved', async () => {
    const caseWithPatch = {
      ...caseWithExtractionOn,
      attributes: {
        ...caseWithExtractionOn.attributes,
        observables: [newObservable],
        total_observables: 1,
      },
    };
    extractObservablesFromAlertsMock.mockResolvedValue({
      status: 'extracted',
      alertsRequested: 2,
      alertsFound: 1,
      caseWithPatch,
      newlyAddedObservables: [newObservable],
    });

    const res = await extractCaseObservables('case-id', clientArgs, casesClient);

    expect(res).toEqual(
      expect.objectContaining({
        status: 'extracted',
        newObservablesCount: 1,
        alertsRequested: 2,
        alertsFound: 1,
      })
    );
    expect(res.case.observables).toEqual([newObservable]);
    expect(res.case.total_observables).toBe(1);
    expect(clientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        caseId: caseWithPatch.id,
        observableTypeKeys: [OBSERVABLE_TYPE_IPV4.key],
      })
    );
  });

  it.each([
    ['no_matching_fields', 'no_new_observables'],
    ['no_new_observables', 'no_new_observables'],
    ['cap_reached', 'cap_reached'],
    ['alerts_not_found', 'alerts_not_found'],
  ] as const)(
    'maps the core outcome %s to the status %s, with the unchanged case and no event',
    async (coreStatus, expectedStatus) => {
      extractObservablesFromAlertsMock.mockResolvedValue({
        status: coreStatus,
        alertsRequested: 2,
        alertsFound: 1,
      });

      const res = await extractCaseObservables('case-id', clientArgs, casesClient);

      expect(res).toEqual(
        expect.objectContaining({
          status: expectedStatus,
          newObservablesCount: 0,
          alertsRequested: 2,
          alertsFound: 1,
        })
      );
      expect(res.case.id).toBe(caseWithExtractionOn.id);
      expect(clientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
    }
  );

  it('returns the case with its attachment totals', async () => {
    extractObservablesFromAlertsMock.mockResolvedValue({
      status: 'no_new_observables',
      alertsRequested: 2,
      alertsFound: 2,
    });

    const res = await extractCaseObservables('case-id', clientArgs, casesClient);

    expect(attachmentService.getter.getCaseAttatchmentStats).toHaveBeenCalledWith({
      caseIds: [caseWithExtractionOn.id],
    });
    expect(res.case).toEqual(
      expect.objectContaining({ totalAlerts: 2, totalEvents: 1, totalComment: 3 })
    );
  });

  it('throws when the extraction core fails, so the caller can tell a failure from no result', async () => {
    extractObservablesFromAlertsMock.mockRejectedValue(new Error('mget failed'));

    await expect(extractCaseObservables('case-id', clientArgs, casesClient)).rejects.toThrow(
      'mget failed'
    );
  });
});

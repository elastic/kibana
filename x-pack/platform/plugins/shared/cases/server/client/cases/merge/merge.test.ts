/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../../common/constants';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { MergeCasesRequest } from '../../../../common/types/api';
import type { AttachmentV2, Case } from '../../../../common/types/domain';
import { CaseSeverity, CaseStatuses, UserActionTypes } from '../../../../common/types/domain';
import { Operations } from '../../../authorization';
import { basicCaseFields } from '../../../services/test_utils';
import { createCasesClientMock, createCasesClientMockArgs } from '../../mocks';
import { bulkUpdate } from '../bulk_update';
import { merge } from './merge';
import { mergePreview } from './preview';

jest.mock('../bulk_update');

const bulkUpdateMock = jest.mocked(bulkUpdate);

const makeCase = (id: string, createdAt: string, overrides: Partial<Case> = {}): Case => ({
  ...basicCaseFields,
  id,
  version: `${id}-version`,
  totalComment: 0,
  totalAlerts: 0,
  created_at: createdAt,
  ...overrides,
});

const alertAttachment = (id: string, alertIds: string[]): AttachmentV2 => ({
  id,
  version: 'attachment-version',
  type: SECURITY_ALERT_ATTACHMENT_TYPE,
  attachmentId: alertIds,
  owner: SECURITY_SOLUTION_OWNER,
  metadata: { index: alertIds.map(() => 'alerts-index'), rule: { id: 'rule-1', name: 'Rule' } },
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
});

const toSavedObject = (theCase: Case) => ({
  id: theCase.id,
  type: CASE_SAVED_OBJECT,
  attributes: { ...basicCaseFields, title: theCase.title, status: theCase.status },
  references: [],
  version: theCase.version,
});

const firstCase = makeCase('case-1', '2024-01-01T00:00:00.000Z', {
  title: 'Phishing',
  incremental_id: 118,
  severity: CaseSeverity.HIGH,
});
const secondCase = makeCase('case-2', '2024-02-01T00:00:00.000Z', {
  title: 'Phishing follow-up',
  incremental_id: 121,
  severity: CaseSeverity.CRITICAL,
});
const newCase = makeCase('new-case', '2024-03-01T00:00:00.000Z', { title: 'Phishing' });

const request: MergeCasesRequest = {
  caseIds: [firstCase.id, secondCase.id],
  fields: {
    title: 'Phishing',
    description: 'Combined',
    severity: CaseSeverity.CRITICAL,
    category: null,
    tags: ['defacement'],
  },
  closeOriginals: true,
};

describe('merge', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const {
    services: { caseService, userActionService },
    authorization,
  } = clientArgs;

  const mockCases = (cases: Case[], attachments: Record<string, AttachmentV2[]> = {}) => {
    casesClient.cases.bulkGet.mockResolvedValue({ cases, errors: [] });
    casesClient.attachments.getAll.mockImplementation(
      async ({ caseID }) => attachments[caseID] ?? []
    );
    caseService.getCases.mockResolvedValue({ saved_objects: cases.map(toSavedObject) });
    caseService.patchCases.mockResolvedValue({
      saved_objects: cases.map((theCase) => ({
        ...toSavedObject(theCase),
        version: `${theCase.id}-marked`,
      })),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(casesClient.configure.get).mockResolvedValue([]);
    casesClient.cases.create.mockResolvedValue(newCase);
    casesClient.cases.bulkUpdate.mockResolvedValue([secondCase]);
    casesClient.attachments.bulkCreate.mockResolvedValue([]);
    bulkUpdateMock.mockImplementation(async ({ cases }) =>
      cases.map(({ id }) => ({ ...makeCase(id, ''), status: CaseStatuses.closed }))
    );
    mockCases([firstCase, secondCase], {
      [firstCase.id]: [alertAttachment('a1', ['alert-1', 'alert-2'])],
      [secondCase.id]: [alertAttachment('a2', ['alert-2', 'alert-3'])],
    });
  });

  describe('validation', () => {
    it('rejects fewer than two cases', async () => {
      await expect(
        merge({ ...request, caseIds: [firstCase.id] }, clientArgs, casesClient)
      ).rejects.toThrow(/caseIds/);
      expect(casesClient.cases.bulkGet).not.toHaveBeenCalled();
    });

    it('rejects cases from different solutions', async () => {
      mockCases([firstCase, { ...secondCase, owner: OBSERVABILITY_OWNER }]);

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(
        /Cases from different solutions cannot be merged/
      );
      expect(casesClient.cases.create).not.toHaveBeenCalled();
    });

    it('rejects a case that was already merged', async () => {
      mockCases([firstCase, { ...secondCase, merged_into: 'other-case' }]);

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(
        /Case case-2 was already merged into case other-case/
      );
      expect(casesClient.cases.create).not.toHaveBeenCalled();
    });

    it('rejects a destination that is not one of the cases', async () => {
      await expect(
        merge({ ...request, destinationCaseId: 'unknown' }, clientArgs, casesClient)
      ).rejects.toThrow(/The destination case must be one of the cases being merged/);
    });

    it('rejects a closed destination', async () => {
      mockCases([firstCase, { ...secondCase, status: CaseStatuses.closed }]);

      await expect(
        merge({ ...request, destinationCaseId: secondCase.id }, clientArgs, casesClient)
      ).rejects.toThrow(/The destination case case-2 is closed/);
    });

    it('rejects a merge over the alert limit before writing anything', async () => {
      const alertIds = (prefix: string) =>
        Array.from({ length: MAX_ALERTS_PER_CASE }, (_, position) => `${prefix}-${position}`);
      mockCases([firstCase, secondCase], {
        [firstCase.id]: [alertAttachment('a1', alertIds('first'))],
        [secondCase.id]: [alertAttachment('a2', alertIds('second'))],
      });

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(
        /exceeds the limit of 1000 alerts per case by 1000/
      );
      expect(casesClient.cases.create).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('authorizes creating, updating, and commenting on every case', async () => {
      await merge(request, clientArgs, casesClient);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: firstCase.id, owner: SECURITY_SOLUTION_OWNER },
          { id: secondCase.id, owner: SECURITY_SOLUTION_OWNER },
        ],
        operation: [Operations.createCase, Operations.updateCase, Operations.createComment],
      });
    });

    it('does not authorize creating a case when merging into an existing one', async () => {
      await merge({ ...request, destinationCaseId: secondCase.id }, clientArgs, casesClient);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: [Operations.updateCase, Operations.createComment],
        })
      );
    });

    it('writes nothing when the user is not authorized', async () => {
      authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(/Unauthorized/);
      expect(casesClient.cases.create).not.toHaveBeenCalled();
      expect(caseService.patchCases).not.toHaveBeenCalled();
    });
  });

  describe('into a new case', () => {
    it('creates the case, copies deduped alerts, marks and closes the originals, and records activity', async () => {
      const response = await merge(
        { ...request, note: 'Merged phishing' },
        clientArgs,
        casesClient
      );

      expect(casesClient.cases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Phishing',
          severity: CaseSeverity.CRITICAL,
          owner: SECURITY_SOLUTION_OWNER,
        })
      );
      expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
        caseId: newCase.id,
        attachments: [
          expect.objectContaining({ attachmentId: ['alert-1', 'alert-2'] }),
          expect.objectContaining({ attachmentId: ['alert-3'] }),
        ],
      });
      expect(caseService.patchCases).toHaveBeenCalledWith({
        cases: [
          expect.objectContaining({
            caseId: firstCase.id,
            updatedAttributes: expect.objectContaining({ merged_into: newCase.id }),
          }),
          expect.objectContaining({
            caseId: secondCase.id,
            updatedAttributes: expect.objectContaining({ merged_into: newCase.id }),
          }),
        ],
        refresh: false,
      });
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        {
          cases: [
            { id: firstCase.id, version: 'case-1-marked', status: CaseStatuses.closed },
            { id: secondCase.id, version: 'case-2-marked', status: CaseStatuses.closed },
          ],
        },
        clientArgs,
        casesClient,
        { skipAlertSync: true }
      );

      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions.map(({ caseId }) => caseId)).toEqual([
        newCase.id,
        firstCase.id,
        secondCase.id,
      ]);
      expect(userActions[0]).toEqual(
        expect.objectContaining({
          type: UserActionTypes.merge,
          payload: {
            merge: {
              destination: { id: newCase.id, title: 'Phishing', incrementalId: null },
              sources: [
                {
                  id: firstCase.id,
                  title: 'Phishing',
                  incrementalId: 118,
                  copied: { alerts: 2, events: 0, observables: 0, other: 0 },
                },
                {
                  id: secondCase.id,
                  title: 'Phishing follow-up',
                  incrementalId: 121,
                  copied: { alerts: 1, events: 0, observables: 0, other: 0 },
                },
              ],
              closedSources: true,
            },
          },
        })
      );
      expect(casesClient.attachments.add).toHaveBeenCalledWith({
        caseId: newCase.id,
        comment: expect.objectContaining({ data: { content: 'Merged phishing' } }),
      });

      expect(response).toEqual({
        destination: { id: newCase.id, title: 'Phishing', incrementalId: null, isNew: true },
        mergedCaseIds: [firstCase.id, secondCase.id],
        closedCaseIds: [firstCase.id, secondCase.id],
        copied: { alerts: 3, events: 0, observables: 0, other: 0 },
        failures: [],
      });
    });

    it('does not close the originals when not asked to', async () => {
      const response = await merge({ ...request, closeOriginals: false }, clientArgs, casesClient);

      expect(bulkUpdateMock).not.toHaveBeenCalled();
      expect(response.closedCaseIds).toEqual([]);
    });
  });

  describe('into an existing case', () => {
    it('updates only the fields that changed and does not mark or close the destination', async () => {
      await merge(
        {
          ...request,
          destinationCaseId: secondCase.id,
          fields: { ...request.fields, title: secondCase.title },
        },
        clientArgs,
        casesClient
      );

      expect(casesClient.cases.create).not.toHaveBeenCalled();
      expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith({
        cases: [{ id: secondCase.id, version: secondCase.version, description: 'Combined' }],
      });
      expect(caseService.getCases).toHaveBeenCalledWith({ caseIds: [firstCase.id] });
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        { cases: [expect.objectContaining({ id: firstCase.id })] },
        clientArgs,
        casesClient,
        { skipAlertSync: true }
      );
    });
  });

  describe('partial failures', () => {
    it('throws and changes nothing when the destination cannot be created', async () => {
      casesClient.cases.create.mockRejectedValueOnce(new Error('create failed'));

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(/create failed/);
      expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
      expect(caseService.patchCases).not.toHaveBeenCalled();
    });

    it('keeps going when copying attachments fails and reports the failure', async () => {
      casesClient.attachments.bulkCreate.mockRejectedValueOnce(new Error('copy failed'));

      const response = await merge(request, clientArgs, casesClient);

      expect(response.failures).toEqual([
        { step: 'attachments', caseId: null, message: 'copy failed' },
      ]);
      expect(response.copied).toEqual({ alerts: 0, events: 0, observables: 0, other: 0 });
      expect(response.mergedCaseIds).toEqual([firstCase.id, secondCase.id]);
      expect(userActionService.creator.bulkCreateUserAction).toHaveBeenCalled();
      expect(clientArgs.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('step "attachments" failed: copy failed')
      );
    });

    it('does not close or record activity on an original that could not be marked', async () => {
      caseService.patchCases.mockResolvedValueOnce({
        saved_objects: [
          { ...toSavedObject(firstCase), version: 'case-1-marked' },
          {
            id: secondCase.id,
            type: CASE_SAVED_OBJECT,
            error: { statusCode: 409, error: 'Conflict', message: 'version conflict' },
          },
        ],
      });

      const response = await merge(request, clientArgs, casesClient);

      expect(response.failures).toEqual([
        { step: 'mark', caseId: secondCase.id, message: 'version conflict' },
      ]);
      expect(response.mergedCaseIds).toEqual([firstCase.id]);
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        { cases: [expect.objectContaining({ id: firstCase.id })] },
        clientArgs,
        casesClient,
        { skipAlertSync: true }
      );
      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions.map(({ caseId }) => caseId)).toEqual([newCase.id, firstCase.id]);
    });

    it('reports a failure to close the originals', async () => {
      bulkUpdateMock.mockRejectedValueOnce(new Error('close failed'));

      const response = await merge(request, clientArgs, casesClient);

      expect(response.failures).toEqual([{ step: 'close', caseId: null, message: 'close failed' }]);
      expect(response.closedCaseIds).toEqual([]);
    });
  });
});

describe('mergePreview', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();

  beforeEach(() => {
    jest.clearAllMocks();
    casesClient.cases.bulkGet.mockResolvedValue({ cases: [firstCase, secondCase], errors: [] });
    casesClient.attachments.getAll.mockResolvedValue([]);
  });

  it('returns the cases, field defaults, and attachment counts without writing', async () => {
    const preview = await mergePreview(
      { caseIds: [firstCase.id, secondCase.id] },
      clientArgs,
      casesClient
    );

    expect(preview.cases.map(({ id, incrementalId }) => ({ id, incrementalId }))).toEqual([
      { id: firstCase.id, incrementalId: 118 },
      { id: secondCase.id, incrementalId: 121 },
    ]);
    expect(preview.destinationCaseId).toBeNull();
    expect(preview.fields.severity).toEqual(
      expect.objectContaining({ value: CaseSeverity.CRITICAL, provenance: 'highest' })
    );
    expect(casesClient.cases.create).not.toHaveBeenCalled();
    expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
  });
});

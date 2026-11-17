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
import { bulkCreate as bulkCreateAttachments } from '../../attachments/bulk_create';
import { bulkUpdate } from '../bulk_update';
import { bulkAddObservables } from '../observables';
import { merge } from './merge';
import { mergePreview } from './preview';

jest.mock('../../attachments/bulk_create');
jest.mock('../bulk_update');
jest.mock('../observables');

const bulkCreateAttachmentsMock = jest.mocked(bulkCreateAttachments);
const bulkUpdateMock = jest.mocked(bulkUpdate);
const bulkAddObservablesMock = jest.mocked(bulkAddObservables);

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

const toSavedObject = ({ id, title, status, version, merged_into: mergedInto }: Case) => ({
  id,
  type: CASE_SAVED_OBJECT,
  attributes: {
    ...basicCaseFields,
    title,
    status,
    ...(mergedInto != null ? { merged_into: mergedInto } : {}),
  },
  references: [],
  version,
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
    caseService.getCases.mockImplementation(async ({ caseIds }) => ({
      saved_objects: cases.filter(({ id }) => caseIds.includes(id)).map(toSavedObject),
    }));
    caseService.patchCases.mockImplementation(async ({ cases: patchedCases }) => ({
      saved_objects: patchedCases.map(({ originalCase, updatedAttributes }) => ({
        ...originalCase,
        attributes: { ...originalCase.attributes, ...updatedAttributes },
        version: `${originalCase.id}-marked`,
      })),
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(casesClient.configure.get).mockResolvedValue([]);
    casesClient.cases.create.mockResolvedValue(newCase);
    bulkCreateAttachmentsMock.mockResolvedValue([]);
    bulkAddObservablesMock.mockResolvedValue(newCase);
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

    it('merges an over-limit selection once enough alerts are excluded, and records what stayed behind', async () => {
      const alertIds = (prefix: string) =>
        Array.from({ length: MAX_ALERTS_PER_CASE }, (_, position) => `${prefix}-${position}`);
      mockCases([firstCase, secondCase], {
        [firstCase.id]: [alertAttachment('a1', alertIds('first'))],
        [secondCase.id]: [alertAttachment('a2', ['second-0', 'second-1'])],
      });

      const response = await merge(
        {
          ...request,
          excludedAttachments: [
            'alerts|first-0|alerts-index',
            'alerts|first-1|alerts-index',
            'alerts|second-1|alerts-index',
          ],
        },
        clientArgs,
        casesClient
      );

      expect(response.copied.alerts).toBe(MAX_ALERTS_PER_CASE - 1);
      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions[0].payload).toEqual({
        merge: expect.objectContaining({
          sources: [
            expect.objectContaining({
              id: firstCase.id,
              excluded: { alerts: 2, events: 0, observables: 0, other: 0 },
            }),
            expect.objectContaining({
              id: secondCase.id,
              excluded: { alerts: 1, events: 0, observables: 0, other: 0 },
            }),
          ],
        }),
      });
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
      expect(bulkCreateAttachmentsMock).not.toHaveBeenCalled();
      expect(bulkUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('into a new case', () => {
    it('creates the case, copies deduped alerts, marks and closes the originals, and records activity on every case', async () => {
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
      expect(bulkCreateAttachmentsMock).toHaveBeenCalledWith(
        {
          caseId: newCase.id,
          attachments: [
            expect.objectContaining({ attachmentId: ['alert-1', 'alert-2'] }),
            expect.objectContaining({ attachmentId: ['alert-3'] }),
          ],
        },
        clientArgs,
        { skipUserActions: true }
      );
      expect(caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            expect.objectContaining({
              caseId: firstCase.id,
              version: firstCase.version,
              updatedAttributes: expect.objectContaining({ merged_into: [newCase.id] }),
            }),
            expect.objectContaining({
              caseId: secondCase.id,
              version: secondCase.version,
              updatedAttributes: expect.objectContaining({ merged_into: [newCase.id] }),
            }),
          ],
        })
      );
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
                  duplicates: { alerts: 0, events: 0, observables: 0, other: 0 },
                  excluded: { alerts: 0, events: 0, observables: 0, other: 0 },
                },
                {
                  id: secondCase.id,
                  title: 'Phishing follow-up',
                  incrementalId: 121,
                  copied: { alerts: 1, events: 0, observables: 0, other: 0 },
                  duplicates: { alerts: 1, events: 0, observables: 0, other: 0 },
                  excluded: { alerts: 0, events: 0, observables: 0, other: 0 },
                },
              ],
              closedSources: true,
              updatedFields: [],
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

    it('copies deduped observables, before the alerts, without their own activity entry', async () => {
      const observable = (id: string, typeKey: string, value: string) => ({
        id,
        typeKey,
        value,
        description: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: null,
      });
      mockCases(
        [
          { ...firstCase, observables: [observable('o1', 'ipv4', '10.0.0.1')] },
          {
            ...secondCase,
            observables: [
              observable('o2', 'ipv4', '10.0.0.1'),
              observable('o3', 'hostname', 'build-01'),
            ],
          },
        ],
        { [firstCase.id]: [alertAttachment('a1', ['alert-1'])] }
      );

      const response = await merge(request, clientArgs, casesClient);

      expect(bulkAddObservablesMock).toHaveBeenCalledWith(
        {
          caseId: newCase.id,
          observables: [
            { typeKey: 'ipv4', value: '10.0.0.1', description: null },
            { typeKey: 'hostname', value: 'build-01', description: null },
          ],
        },
        clientArgs,
        casesClient,
        { skipUserAction: true }
      );
      expect(bulkAddObservablesMock.mock.invocationCallOrder[0]).toBeLessThan(
        bulkCreateAttachmentsMock.mock.invocationCallOrder[0]
      );
      expect(response.copied).toEqual({ alerts: 1, events: 0, observables: 2, other: 0 });
    });

    it('does not close the originals when not asked to', async () => {
      const response = await merge({ ...request, closeOriginals: false }, clientArgs, casesClient);

      expect(bulkUpdateMock).not.toHaveBeenCalled();
      expect(response.closedCaseIds).toEqual([]);
    });

    it('merges an original that is already closed without closing it again', async () => {
      mockCases([firstCase, { ...secondCase, status: CaseStatuses.closed }]);

      const response = await merge(request, clientArgs, casesClient);

      expect(bulkUpdateMock).toHaveBeenCalledWith(
        { cases: [{ id: firstCase.id, version: 'case-1-marked', status: CaseStatuses.closed }] },
        clientArgs,
        casesClient,
        { skipAlertSync: true }
      );
      expect(response.mergedCaseIds).toEqual([firstCase.id, secondCase.id]);
    });

    it('adds the new case to the cases an original was already merged into', async () => {
      mockCases([{ ...firstCase, merged_into: ['earlier-case'] }, secondCase]);

      await merge(request, clientArgs, casesClient);

      const [{ cases }] = caseService.patchCases.mock.calls[0];
      expect(
        cases.map(({ caseId, updatedAttributes }) => [caseId, updatedAttributes.merged_into])
      ).toEqual([
        [firstCase.id, ['earlier-case', newCase.id]],
        [secondCase.id, [newCase.id]],
      ]);
    });
  });

  describe('into an existing case', () => {
    it('updates only the fields that changed, and marks, closes, and records activity on the other cases only', async () => {
      bulkUpdateMock.mockResolvedValueOnce([{ ...secondCase, description: 'Combined' }]);

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
      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
      expect(bulkUpdateMock).toHaveBeenNthCalledWith(
        1,
        { cases: [{ id: secondCase.id, version: secondCase.version, description: 'Combined' }] },
        clientArgs,
        casesClient,
        { skipUserActions: true }
      );
      expect(caseService.getCases).toHaveBeenCalledWith({ caseIds: [firstCase.id] });
      expect(bulkUpdateMock).toHaveBeenNthCalledWith(
        2,
        { cases: [expect.objectContaining({ id: firstCase.id })] },
        clientArgs,
        casesClient,
        { skipAlertSync: true }
      );
      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions.map(({ caseId }) => caseId)).toEqual([secondCase.id, firstCase.id]);
    });

    it('records the changed fields in the merge entry instead of writing an entry per field', async () => {
      bulkUpdateMock.mockResolvedValueOnce([{ ...secondCase, description: 'Combined' }]);

      await merge(
        {
          ...request,
          destinationCaseId: secondCase.id,
          fields: { ...request.fields, title: secondCase.title, tags: ['merged'] },
        },
        clientArgs,
        casesClient
      );

      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions[0].payload).toEqual({
        merge: expect.objectContaining({ updatedFields: ['description', 'tags'] }),
      });
    });

    it('updates nothing and records no changed fields when the fields match the destination', async () => {
      await merge(
        {
          ...request,
          destinationCaseId: secondCase.id,
          fields: {
            ...request.fields,
            title: secondCase.title,
            description: secondCase.description,
            tags: secondCase.tags,
            severity: secondCase.severity,
            category: secondCase.category,
          },
        },
        clientArgs,
        casesClient
      );

      expect(bulkUpdateMock.mock.calls.map(([{ cases }]) => cases.map(({ id }) => id))).toEqual([
        [firstCase.id],
      ]);
      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions[0].payload).toEqual({
        merge: expect.objectContaining({ updatedFields: [] }),
      });
    });

    it('lists the destination once when an original is merged into it again', async () => {
      mockCases([{ ...firstCase, merged_into: [secondCase.id] }, secondCase]);

      await merge({ ...request, destinationCaseId: secondCase.id }, clientArgs, casesClient);

      expect(caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            expect.objectContaining({
              caseId: firstCase.id,
              updatedAttributes: expect.objectContaining({ merged_into: [secondCase.id] }),
            }),
          ],
        })
      );
    });
  });

  describe('partial failures', () => {
    it('throws and changes nothing when the destination cannot be created', async () => {
      casesClient.cases.create.mockRejectedValueOnce(new Error('create failed'));

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(/create failed/);
      expect(bulkCreateAttachmentsMock).not.toHaveBeenCalled();
      expect(bulkUpdateMock).not.toHaveBeenCalled();
    });

    it('keeps going when copying attachments fails and reports the failure', async () => {
      bulkCreateAttachmentsMock.mockRejectedValueOnce(new Error('copy failed'));

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
    expect(preview.fields.title.value).toBe('Merged case: Phishing, Phishing follow-up');
    expect(preview.fields.severity).toEqual(
      expect.objectContaining({ value: CaseSeverity.CRITICAL, provenance: 'highest' })
    );
    expect(casesClient.cases.create).not.toHaveBeenCalled();
    expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    expect(preview.choices).toBeNull();
  });

  it('lists the attachments to choose from when a limit is exceeded', async () => {
    const alertIds = Array.from(
      { length: MAX_ALERTS_PER_CASE + 1 },
      (_, position) => `a-${position}`
    );
    casesClient.attachments.getAll.mockImplementation(async ({ caseID }) =>
      caseID === firstCase.id ? [alertAttachment('a1', alertIds)] : []
    );

    const preview = await mergePreview(
      { caseIds: [firstCase.id, secondCase.id] },
      clientArgs,
      casesClient
    );

    expect(preview.attachments.alerts.overLimit).toBe(1);
    expect(preview.choices?.alerts).toHaveLength(MAX_ALERTS_PER_CASE + 1);
    expect(preview.choices?.alerts[0]).toEqual(
      expect.objectContaining({
        key: 'alerts|a-0|alerts-index',
        sourceCaseId: firstCase.id,
        ruleId: 'rule-1',
        ruleName: 'Rule',
      })
    );
  });
});

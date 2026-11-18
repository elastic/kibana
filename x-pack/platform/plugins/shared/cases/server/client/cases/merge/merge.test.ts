/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../../common/constants';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { CASES_API_ERROR_CODES } from '../../../../common/constants/error_codes';
import type { MergeCasesRequest } from '../../../../common/types/api';
import type { AttachmentV2, Case } from '../../../../common/types/domain';
import { CaseSeverity, CaseStatuses, UserActionTypes } from '../../../../common/types/domain';
import { Operations } from '../../../authorization';
import type { CaseSavedObjectTransformed } from '../../../common/types/case';
import { basicCaseFields } from '../../../services/test_utils';
import { createCasesClientMock, createCasesClientMockArgs } from '../../mocks';
import { addComment } from '../../attachments/add';
import { bulkCreate as bulkCreateAttachments } from '../../attachments/bulk_create';
import { bulkUpdate } from '../bulk_update';
import { create } from '../create';
import { bulkAddObservables } from '../observables';
import { getMergeBlockedAttributes } from './errors';
import { merge } from './merge';
import { mergePreview } from './preview';

jest.mock('../../attachments/add');
jest.mock('../../attachments/bulk_create');
jest.mock('../bulk_update');
jest.mock('../create');
jest.mock('../observables');

const addCommentMock = jest.mocked(addComment);
const bulkCreateAttachmentsMock = jest.mocked(bulkCreateAttachments);
const bulkUpdateMock = jest.mocked(bulkUpdate);
const createMock = jest.mocked(create);
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

const alertAttachment = (
  id: string,
  alertIds: string[],
  createdAt = '2024-01-01'
): AttachmentV2 => ({
  id,
  version: 'attachment-version',
  type: SECURITY_ALERT_ATTACHMENT_TYPE,
  attachmentId: alertIds,
  owner: SECURITY_SOLUTION_OWNER,
  metadata: { index: alertIds.map(() => 'alerts-index'), rule: { id: 'rule-1', name: 'Rule' } },
  created_at: `${createdAt}T00:00:00.000Z`,
  created_by: { username: 'elastic', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
});

const observable = (id: string, value: string) => ({
  id,
  typeKey: 'ip',
  value,
  description: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: null,
});

const firstCase = makeCase('case-1', '2024-01-01T00:00:00.000Z', {
  incremental_id: 118,
  severity: CaseSeverity.HIGH,
});
const secondCase = makeCase('case-2', '2024-02-01T00:00:00.000Z', {
  incremental_id: 121,
  severity: CaseSeverity.CRITICAL,
});
const newCase = makeCase('new-case', '2024-03-01T00:00:00.000Z');

const request: MergeCasesRequest = {
  caseIds: [firstCase.id, secondCase.id],
  fields: { severity: CaseSeverity.CRITICAL },
};

const eligibleAlerts = { ineligible: new Map(), missingDestination: [] };

describe('merge', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const {
    services: {
      caseService,
      userActionService,
      licensingService,
      alertsService,
      fieldDefinitionsService,
    },
    authorization,
  } = clientArgs;

  /** The cases as stored: what `getCase` reads while the merge runs. */
  let stored: Map<string, Case>;

  const toSavedObject = (theCase: Case): CaseSavedObjectTransformed => ({
    id: theCase.id,
    type: CASE_SAVED_OBJECT,
    attributes: { ...basicCaseFields, ...theCase } as CaseSavedObjectTransformed['attributes'],
    references: [],
    version: theCase.version,
  });

  const mockCases = (cases: Case[], attachments: Record<string, AttachmentV2[]> = {}) => {
    stored = new Map(cases.map((theCase) => [theCase.id, theCase]));
    casesClient.cases.bulkGet.mockImplementation(async ({ ids }) => ({
      cases: cases.filter(({ id }) => ids.includes(id)),
      errors: [],
    }));
    casesClient.attachments.getAll.mockImplementation(
      async ({ caseID }) => attachments[caseID] ?? []
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(casesClient.configure.get).mockResolvedValue([]);
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    authorization.isAuthorized.mockResolvedValue(true);
    alertsService.getAlertsMergeEligibility.mockResolvedValue(eligibleAlerts);
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
    } as unknown as Awaited<ReturnType<typeof fieldDefinitionsService.getFieldDefinitions>>);
    createMock.mockResolvedValue(newCase);
    bulkCreateAttachmentsMock.mockResolvedValue([]);
    bulkAddObservablesMock.mockImplementation(async ({ observables }) => ({
      ...newCase,
      observables: observables.map(({ typeKey, value }, position) => ({
        ...observable(`added-${position}`, value),
        typeKey,
      })),
    }));
    bulkUpdateMock.mockImplementation(async ({ cases }) =>
      cases.map(({ id }) => ({
        ...(stored.get(id) ?? makeCase(id, '')),
        status: CaseStatuses.closed,
      }))
    );
    caseService.getCase.mockImplementation(async ({ id }) => {
      const theCase = stored.get(id);
      if (theCase == null) {
        throw Boom.notFound();
      }
      return toSavedObject(theCase);
    });
    caseService.patchCases.mockImplementation(async ({ cases: patched }) => ({
      saved_objects: patched.map(({ caseId, updatedAttributes }) => {
        const updated = {
          ...(stored.get(caseId) as Case),
          ...(updatedAttributes as Partial<Case>),
          version: `${caseId}-linked`,
        };
        stored.set(caseId, updated);
        return toSavedObject(updated);
      }),
    }));
    mockCases([firstCase, secondCase], {
      [firstCase.id]: [alertAttachment('a1', ['alert-1', 'alert-2'])],
      [secondCase.id]: [alertAttachment('a2', ['alert-2', 'alert-3'])],
    });
  });

  const getBlockedAttributes = async (promise: Promise<unknown>) => {
    const error = await promise.catch((caught) => caught);
    return getMergeBlockedAttributes(error);
  };

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
      expect(createMock).not.toHaveBeenCalled();
    });

    it('rejects a closed destination', async () => {
      mockCases([firstCase, { ...secondCase, status: CaseStatuses.closed }]);

      await expect(
        merge({ ...request, destinationCaseId: secondCase.id }, clientArgs, casesClient)
      ).rejects.toThrow(/The destination case case-2 is closed/);
    });

    it('merges into the case an earlier run created when it is not one of the cases', async () => {
      const created = makeCase('created-earlier', '2024-03-01T00:00:00.000Z');
      mockCases([firstCase, secondCase, created]);

      const response = await merge(
        { ...request, destinationCaseId: created.id },
        clientArgs,
        casesClient
      );

      expect(createMock).not.toHaveBeenCalled();
      expect(response.destination).toEqual(
        expect.objectContaining({ id: created.id, isNew: false })
      );
      expect(response.sources.map(({ caseId }) => caseId)).toEqual([firstCase.id, secondCase.id]);
    });

    it('refuses with every unresolved conflict before writing anything', async () => {
      mockCases([
        { ...firstCase, title: 'Phishing' },
        { ...secondCase, title: 'Phishing follow-up' },
      ]);

      const attributes = await getBlockedAttributes(
        merge({ caseIds: request.caseIds }, clientArgs, casesClient)
      );

      expect(attributes).toEqual({
        code: CASES_API_ERROR_CODES.MERGE_BLOCKED,
        conflicts: [
          { field: 'title', reason: 'differentValues' },
          { field: 'severity', reason: 'differentValues' },
        ],
        limits: [],
      });
      expect(createMock).not.toHaveBeenCalled();
      expect(bulkCreateAttachmentsMock).not.toHaveBeenCalled();
    });

    it('refuses a merge over the alert limit with how much to leave out', async () => {
      const alertIds = (prefix: string) =>
        Array.from({ length: MAX_ALERTS_PER_CASE }, (_, position) => `${prefix}-${position}`);
      mockCases([firstCase, secondCase], {
        [firstCase.id]: [alertAttachment('a1', alertIds('first'))],
        [secondCase.id]: [alertAttachment('a2', alertIds('second'))],
      });

      const attributes = await getBlockedAttributes(merge(request, clientArgs, casesClient));

      expect(attributes).toEqual(
        expect.objectContaining({
          limits: [{ kind: 'alerts', max: MAX_ALERTS_PER_CASE, total: 2000, overBy: 1000 }],
        })
      );
      expect(createMock).not.toHaveBeenCalled();
    });

    it('keeps the newest alerts up to the limit when asked to', async () => {
      const alertIds = (prefix: string) =>
        Array.from({ length: MAX_ALERTS_PER_CASE }, (_, position) => `${prefix}-${position}`);
      mockCases([firstCase, secondCase], {
        [firstCase.id]: [alertAttachment('a1', alertIds('old'), '2024-01-01')],
        [secondCase.id]: [alertAttachment('a2', alertIds('new'), '2024-02-01')],
      });

      const response = await merge(
        { ...request, attachments: { alerts: { mode: 'newest' } } },
        clientArgs,
        casesClient
      );

      expect(response.sources).toEqual([
        expect.objectContaining({
          caseId: firstCase.id,
          copied: expect.objectContaining({ alerts: 0 }),
          leftOut: expect.objectContaining({ alerts: MAX_ALERTS_PER_CASE }),
        }),
        expect.objectContaining({
          caseId: secondCase.id,
          copied: expect.objectContaining({ alerts: MAX_ALERTS_PER_CASE }),
        }),
      ]);
    });

    it('refuses assignees without the right to assign', async () => {
      authorization.isAuthorized.mockResolvedValue(false);

      await expect(
        merge(
          { ...request, fields: { ...request.fields, assignees: [{ uid: 'u1' }] } },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(/assign privilege/);
      expect(createMock).not.toHaveBeenCalled();
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
        expect.objectContaining({ operation: [Operations.updateCase, Operations.createComment] })
      );
    });

    it('writes nothing when the user is not authorized', async () => {
      authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(merge(request, clientArgs, casesClient)).rejects.toThrow(/Unauthorized/);
      expect(createMock).not.toHaveBeenCalled();
      expect(bulkCreateAttachmentsMock).not.toHaveBeenCalled();
      expect(bulkUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('into a new case', () => {
    it('creates the case from the merged values, with the merge context on its writes', async () => {
      await merge(request, clientArgs, casesClient);

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: basicCaseFields.title,
          severity: CaseSeverity.CRITICAL,
          owner: SECURITY_SOLUTION_OWNER,
          tags: ['defacement'],
          settings: { syncAlerts: true },
        }),
        expect.objectContaining({
          mergeContext: { sourceCaseIds: [firstCase.id, secondCase.id] },
        }),
        casesClient
      );
      expect(createMock.mock.calls[0][0]).not.toHaveProperty('assignees');
    });

    it('creates the case without assignees when the user cannot assign', async () => {
      authorization.isAuthorized.mockResolvedValue(false);
      mockCases([{ ...firstCase, assignees: [{ uid: 'u1' }] }, secondCase]);

      await merge(request, clientArgs, casesClient);

      expect(createMock.mock.calls[0][0]).toEqual(expect.objectContaining({ assignees: [] }));
    });

    it('copies each source on its own, skipping duplicates, alert sync and extraction', async () => {
      await merge(request, clientArgs, casesClient);

      const options = {
        skipUserActions: true,
        skipAlertStatusSync: true,
        skipObservableExtraction: true,
      };
      expect(bulkCreateAttachmentsMock).toHaveBeenNthCalledWith(
        1,
        {
          caseId: newCase.id,
          attachments: [expect.objectContaining({ attachmentId: ['alert-1', 'alert-2'] })],
        },
        expect.objectContaining({
          mergeContext: expect.objectContaining({ destinationCaseId: newCase.id }),
        }),
        options
      );
      expect(bulkCreateAttachmentsMock).toHaveBeenNthCalledWith(
        2,
        {
          caseId: newCase.id,
          attachments: [expect.objectContaining({ attachmentId: ['alert-3'] })],
        },
        expect.anything(),
        options
      );
    });

    it('adds each source observables in one call', async () => {
      mockCases([
        { ...firstCase, observables: [observable('o1', '1.1.1.1')] },
        {
          ...secondCase,
          observables: [observable('o2', '1.1.1.1'), observable('o3', '2.2.2.2')],
        },
      ]);

      const response = await merge(request, clientArgs, casesClient);

      expect(bulkAddObservablesMock).toHaveBeenCalledTimes(2);
      expect(bulkAddObservablesMock.mock.calls[1][0].observables).toEqual([
        { typeKey: 'ip', value: '2.2.2.2', description: null },
      ]);
      expect(bulkAddObservablesMock.mock.calls[1][3]).toEqual({ skipUserAction: true });
      expect(response.sources[1]).toEqual(
        expect.objectContaining({
          copied: expect.objectContaining({ observables: 1 }),
          existing: expect.objectContaining({ observables: 1 }),
        })
      );
    });

    it('links and closes every source, then records the merge', async () => {
      const response = await merge(
        { ...request, note: 'Merged phishing' },
        clientArgs,
        casesClient
      );

      expect(caseService.patchCases).toHaveBeenCalledTimes(2);
      expect(caseService.patchCases.mock.calls[0][0].cases[0]).toEqual(
        expect.objectContaining({
          caseId: firstCase.id,
          version: firstCase.version,
          updatedAttributes: expect.objectContaining({
            merge: expect.objectContaining({ merged_into: [newCase.id], closed_by_merge: false }),
          }),
        })
      );
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        { cases: [{ id: firstCase.id, version: 'case-1-linked', status: CaseStatuses.closed }] },
        expect.anything(),
        casesClient,
        { skipAlertSync: true, skipRequiredOnClose: true, markClosedByMerge: true }
      );
      expect(response.sources).toEqual([
        expect.objectContaining({ caseId: firstCase.id, outcome: 'merged', closed: true }),
        expect.objectContaining({ caseId: secondCase.id, outcome: 'merged', closed: true }),
      ]);
      expect(response.failures).toEqual([]);

      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions.map(({ caseId, type }) => [caseId, type])).toEqual([
        [newCase.id, UserActionTypes.merge],
        [firstCase.id, UserActionTypes.merge],
        [secondCase.id, UserActionTypes.merge],
      ]);
      expect(addCommentMock).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: newCase.id }),
        expect.anything()
      );
      expect(userActionService.creator.auditLogMerge).toHaveBeenCalledWith({
        destinationId: newCase.id,
        sourceIds: [firstCase.id, secondCase.id],
      });
    });

    it('keeps the sources open when asked to', async () => {
      const response = await merge({ ...request, closeSources: false }, clientArgs, casesClient);

      expect(bulkUpdateMock).not.toHaveBeenCalled();
      expect(response.sources.every(({ outcome, closed }) => outcome === 'merged' && !closed)).toBe(
        true
      );
    });

    it('links a source that was already closed without closing it again', async () => {
      mockCases([firstCase, { ...secondCase, status: CaseStatuses.closed }]);

      const response = await merge(request, clientArgs, casesClient);

      expect(bulkUpdateMock).toHaveBeenCalledTimes(1);
      expect(response.sources[1]).toEqual(
        expect.objectContaining({ outcome: 'merged', closed: false })
      );
    });
  });

  describe('partial failures', () => {
    it('does not link a source whose copy failed, and still merges the others', async () => {
      bulkCreateAttachmentsMock.mockRejectedValueOnce(new Error('index unavailable'));

      const response = await merge(request, clientArgs, casesClient);

      expect(response.sources).toEqual([
        expect.objectContaining({ caseId: firstCase.id, outcome: 'notMerged', closed: false }),
        expect.objectContaining({ caseId: secondCase.id, outcome: 'merged', closed: true }),
      ]);
      expect(response.failures).toEqual([
        { step: 'copy', caseId: firstCase.id, reason: 'index unavailable' },
      ]);
      expect(caseService.patchCases).toHaveBeenCalledTimes(1);
    });

    it('leaves observables out below Platinum and still merges the source', async () => {
      licensingService.isAtLeastPlatinum.mockResolvedValue(false);
      mockCases([{ ...firstCase, observables: [observable('o1', '1.1.1.1')] }, secondCase]);

      const response = await merge(request, clientArgs, casesClient);

      expect(bulkAddObservablesMock).not.toHaveBeenCalled();
      expect(response.sources[0]).toEqual(
        expect.objectContaining({
          outcome: 'merged',
          leftOut: expect.objectContaining({ observables: 1 }),
        })
      );
    });

    it('does not link a source another merge linked first', async () => {
      caseService.getCase.mockImplementation(async ({ id }) => {
        const theCase = stored.get(id) as Case;
        return toSavedObject(
          id === firstCase.id
            ? {
                ...theCase,
                version: 'changed',
                merge: {
                  merged_into: ['other-destination'],
                  merged_at: '2024-04-01T00:00:00.000Z',
                  closed_by_merge: false,
                },
              }
            : theCase
        );
      });

      const response = await merge(request, clientArgs, casesClient);

      expect(response.sources[0]).toEqual(expect.objectContaining({ outcome: 'notMerged' }));
      expect(response.failures).toEqual([
        expect.objectContaining({ step: 'mark', caseId: firstCase.id }),
      ]);
    });

    it('copies what a source gained during the merge before linking it', async () => {
      const gained = alertAttachment('a3', ['alert-9']);
      caseService.getCase.mockImplementation(async ({ id }) => {
        const theCase = stored.get(id) as Case;
        return toSavedObject(
          id === firstCase.id && theCase.version === firstCase.version
            ? { ...theCase, version: 'gained-alert' }
            : theCase
        );
      });
      casesClient.attachments.getAll.mockImplementation(async ({ caseID }) =>
        caseID === firstCase.id
          ? [alertAttachment('a1', ['alert-1', 'alert-2']), gained]
          : [alertAttachment('a2', ['alert-2', 'alert-3'])]
      );
      // The plan reads the attachments before the alert arrives.
      casesClient.attachments.getAll
        .mockImplementationOnce(async () => [alertAttachment('a1', ['alert-1', 'alert-2'])])
        .mockImplementationOnce(async () => [alertAttachment('a2', ['alert-2', 'alert-3'])]);

      const response = await merge(request, clientArgs, casesClient);

      expect(bulkCreateAttachmentsMock).toHaveBeenCalledWith(
        {
          caseId: newCase.id,
          attachments: [expect.objectContaining({ attachmentId: ['alert-9'] })],
        },
        expect.anything(),
        expect.anything()
      );
      expect(caseService.patchCases.mock.calls[0][0].cases[0].version).toBe('gained-alert');
      expect(response.sources[0]).toEqual(
        expect.objectContaining({
          outcome: 'merged',
          copied: expect.objectContaining({ alerts: 3 }),
        })
      );
    });

    it('reports a source it could not close and closes the rest', async () => {
      bulkUpdateMock.mockRejectedValueOnce(new Error('conflict'));

      const response = await merge(request, clientArgs, casesClient);

      expect(response.sources).toEqual([
        expect.objectContaining({ caseId: firstCase.id, outcome: 'merged', closed: false }),
        expect.objectContaining({ caseId: secondCase.id, outcome: 'merged', closed: true }),
      ]);
      expect(response.failures).toEqual([
        expect.objectContaining({ step: 'close', caseId: firstCase.id }),
      ]);
    });
  });

  describe('into an existing case', () => {
    it('updates the fields that change without their own activity, and records them', async () => {
      await merge({ ...request, destinationCaseId: firstCase.id }, clientArgs, casesClient);

      expect(bulkUpdateMock).toHaveBeenNthCalledWith(
        1,
        {
          cases: [
            { id: firstCase.id, version: firstCase.version, severity: CaseSeverity.CRITICAL },
          ],
        },
        expect.anything(),
        casesClient,
        { skipUserActions: true }
      );
      const { userActions } = userActionService.creator.bulkCreateUserAction.mock.calls[0][0];
      expect(userActions[0].payload).toEqual({
        merge: expect.objectContaining({ updatedFields: [{ field: 'severity' }] }),
      });
    });

    it('copies only what the destination does not hold yet', async () => {
      const response = await merge(
        { ...request, destinationCaseId: firstCase.id },
        clientArgs,
        casesClient
      );

      expect(bulkCreateAttachmentsMock).toHaveBeenCalledTimes(1);
      expect(bulkCreateAttachmentsMock.mock.calls[0][0].attachments).toEqual([
        expect.objectContaining({ attachmentId: ['alert-3'] }),
      ]);
      expect(response.sources).toEqual([
        expect.objectContaining({
          caseId: secondCase.id,
          copied: expect.objectContaining({ alerts: 1 }),
          existing: expect.objectContaining({ alerts: 1 }),
        }),
      ]);
    });
  });
});

describe('mergePreview', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const {
    services: { licensingService, alertsService, fieldDefinitionsService },
  } = clientArgs;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(casesClient.configure.get).mockResolvedValue([]);
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    alertsService.getAlertsMergeEligibility.mockResolvedValue(eligibleAlerts);
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
    } as unknown as Awaited<ReturnType<typeof fieldDefinitionsService.getFieldDefinitions>>);
    casesClient.cases.bulkGet.mockResolvedValue({
      cases: [
        { ...firstCase, title: 'Phishing' },
        { ...secondCase, title: 'Phishing follow-up' },
      ],
      errors: [],
    });
    casesClient.attachments.getAll.mockResolvedValue([]);
  });

  it('lists the conflicts and which ones the request settles, without writing', async () => {
    const preview = await mergePreview(
      { caseIds: request.caseIds, fields: { title: 'Phishing' } },
      clientArgs,
      casesClient
    );

    expect(preview.conflicts).toEqual([
      { field: 'title', reason: 'differentValues', resolved: true },
      { field: 'severity', reason: 'differentValues', resolved: false },
    ]);
    expect(preview.canMerge).toBe(false);
    expect(preview.fields.title).toEqual(
      expect.objectContaining({ value: 'Phishing', provenance: 'oldest', hasConflict: true })
    );
    expect(preview.fields.severity).toEqual(
      expect.objectContaining({ value: CaseSeverity.CRITICAL, provenance: 'highest' })
    );
    expect(preview.choices).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('reports alerts the merge leaves out on its own', async () => {
    casesClient.attachments.getAll.mockImplementation(async ({ caseID }) =>
      caseID === firstCase.id ? [alertAttachment('a1', ['alert-1', 'alert-2'])] : []
    );
    alertsService.getAlertsMergeEligibility.mockResolvedValue({
      ineligible: new Map([['alert-2', 'alertCaseLimit' as const]]),
      missingDestination: [],
    });

    const preview = await mergePreview({ caseIds: request.caseIds }, clientArgs, casesClient);

    expect(preview.attachments.alerts).toEqual(
      expect.objectContaining({
        toCopy: 1,
        notCopied: [{ reason: 'alertCaseLimit', count: 1 }],
      })
    );
  });
});

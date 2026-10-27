/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import type { Template, AttachmentAttributes } from '../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { mockCases, mockCaseComments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { CaseStatuses } from '../../../common/types/domain';
import { MAX_ATTACHMENT_IDS_PER_CASES_LOOKUP } from '../../../common/constants';
import { Operations } from '../../authorization';
import {
  get,
  resolve,
  getCasesByAlertID,
  getCasesByAttachmentIDs,
  getTags,
  getReporters,
  getCategories,
} from './get';

describe('get', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCasesByAlertID', () => {
    it('throws with excess fields', async () => {
      await expect(
        getCasesByAlertID(
          // @ts-expect-error: excess attribute
          { options: { owner: 'cases', foo: 'bar' }, alertID: 'test-alert' },
          clientArgs
        )
      ).rejects.toThrow('Excess keys are not allowed');
    });
  });

  describe('getCasesByAttachmentIDs', () => {
    const request = {
      type: 'security.entity',
      owner: 'securitySolution',
      attachmentIds: ['host:a', 'host:b', 'host:c'],
    };

    beforeEach(() => {
      clientArgs.services.attachmentService.getter.getCaseIdsByAttachmentIds.mockResolvedValue([
        {
          attachmentId: 'host:a',
          cases: [
            { id: 'case-1', owner: 'securitySolution' },
            { id: 'case-2', owner: 'securitySolution' },
          ],
        },
        { attachmentId: 'host:b', cases: [{ id: 'case-2', owner: 'securitySolution' }] },
      ]);
    });

    const getAttachmentsFilter = () =>
      clientArgs.services.attachmentService.getter.getCaseIdsByAttachmentIds.mock.calls[0][0]
        .unifiedFilter;

    it('reads the attachments of the owners the user can read, scoped to the given owner', async () => {
      await getCasesByAttachmentIDs(request, clientArgs);

      expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledWith(
        Operations.getCaseIDsByAttachmentIDs
      );
      expect(
        clientArgs.services.attachmentService.getter.getCaseIdsByAttachmentIds
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'security.entity',
          attachmentIds: ['host:a', 'host:b', 'host:c'],
        })
      );
      expect(JSON.stringify(getAttachmentsFilter())).toContain('securitySolution');
    });

    it('scopes the attachments it reads to the owners the user can read', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        authorizedOwners: ['observability'],
        ensureSavedObjectsAreAuthorized: () => {},
      });

      await getCasesByAttachmentIDs(request, clientArgs);

      expect(JSON.stringify(getAttachmentsFilter())).toContain(
        'cases-attachments.attributes.owner'
      );
      expect(JSON.stringify(getAttachmentsFilter())).toContain('observability');
    });

    it('scopes the legacy attachments it reads the same way', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        authorizedOwners: ['observability'],
        ensureSavedObjectsAreAuthorized: () => {},
      });

      await getCasesByAttachmentIDs(request, clientArgs);

      const { legacyFilter } =
        clientArgs.services.attachmentService.getter.getCaseIdsByAttachmentIds.mock.calls[0][0];
      expect(JSON.stringify(legacyFilter)).toContain('cases-comments.attributes.owner');
      expect(JSON.stringify(legacyFilter)).toContain('observability');
      expect(JSON.stringify(legacyFilter)).toContain('securitySolution');
    });

    it('does not read the attachments when the user may not read cases', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockRejectedValueOnce(
        new Error('Unauthorized')
      );

      await expect(getCasesByAttachmentIDs(request, clientArgs)).rejects.toThrow('Unauthorized');
      expect(
        clientArgs.services.attachmentService.getter.getCaseIdsByAttachmentIds
      ).not.toHaveBeenCalled();
    });

    it('returns the case IDs per attachment ID, leaving out attachment IDs in no case', async () => {
      await expect(getCasesByAttachmentIDs(request, clientArgs)).resolves.toEqual([
        { attachmentId: 'host:a', caseIds: ['case-1', 'case-2'] },
        { attachmentId: 'host:b', caseIds: ['case-2'] },
      ]);
      expect(clientArgs.services.caseService.getCaseStatuses).not.toHaveBeenCalled();
    });

    it('keeps only the cases with one of the statuses', async () => {
      clientArgs.services.caseService.getCaseStatuses.mockResolvedValue(
        new Map([
          ['case-1', CaseStatuses.closed],
          ['case-2', CaseStatuses['in-progress']],
        ])
      );

      await expect(
        getCasesByAttachmentIDs(
          { ...request, status: [CaseStatuses.open, CaseStatuses['in-progress']] },
          clientArgs
        )
      ).resolves.toEqual([
        { attachmentId: 'host:a', caseIds: ['case-2'] },
        { attachmentId: 'host:b', caseIds: ['case-2'] },
      ]);
      expect(clientArgs.services.caseService.getCaseStatuses).toHaveBeenCalledWith({
        caseIds: ['case-1', 'case-2'],
      });
    });

    it('authorizes and audits only the cases left after the status filter', async () => {
      const ensureSavedObjectsAreAuthorized = jest.fn();
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        ensureSavedObjectsAreAuthorized,
      });
      clientArgs.services.caseService.getCaseStatuses.mockResolvedValue(
        new Map([
          ['case-1', CaseStatuses.closed],
          ['case-2', CaseStatuses.open],
        ])
      );

      await getCasesByAttachmentIDs({ ...request, status: CaseStatuses.open }, clientArgs);

      expect(ensureSavedObjectsAreAuthorized).toHaveBeenCalledWith([
        { id: 'case-2', owner: 'securitySolution' },
      ]);
    });

    it('authorizes and audits each case it returns once, without reading the cases', async () => {
      const ensureSavedObjectsAreAuthorized = jest.fn();
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        ensureSavedObjectsAreAuthorized,
      });

      await getCasesByAttachmentIDs(request, clientArgs);

      expect(ensureSavedObjectsAreAuthorized).toHaveBeenCalledWith([
        { id: 'case-1', owner: 'securitySolution' },
        { id: 'case-2', owner: 'securitySolution' },
      ]);
      expect(clientArgs.services.caseService.getCaseStatuses).not.toHaveBeenCalled();
    });

    it('leaves out cases that are not found', async () => {
      clientArgs.services.caseService.getCaseStatuses.mockResolvedValue(
        new Map([['case-2', CaseStatuses.open]])
      );

      await expect(
        getCasesByAttachmentIDs({ ...request, status: CaseStatuses.open }, clientArgs)
      ).resolves.toEqual([
        { attachmentId: 'host:a', caseIds: ['case-2'] },
        { attachmentId: 'host:b', caseIds: ['case-2'] },
      ]);
    });

    it('rejects an empty list of attachment IDs', async () => {
      await expect(
        getCasesByAttachmentIDs({ ...request, attachmentIds: [] }, clientArgs)
      ).rejects.toThrow('The length of the field attachmentIds is too short');
    });

    it(`rejects more than ${MAX_ATTACHMENT_IDS_PER_CASES_LOOKUP} attachment IDs`, async () => {
      await expect(
        getCasesByAttachmentIDs(
          {
            ...request,
            attachmentIds: Array.from(
              { length: MAX_ATTACHMENT_IDS_PER_CASES_LOOKUP + 1 },
              (_, i) => `host:${i}`
            ),
          },
          clientArgs
        )
      ).rejects.toThrow('The length of the field attachmentIds is too long');
    });
  });

  describe('getTags', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getTags({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'Excess keys are not allowed'
      );
    });
  });

  describe('getReporters', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getReporters({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'Excess keys are not allowed'
      );
    });
  });

  describe('getCategories', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getCategories({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'Excess keys are not allowed'
      );
    });
  });

  describe('extended field labels enrichment', () => {
    const globalFieldDef = {
      fieldDefinitionId: 'fd-priority',
      name: 'priority',
      owner: 'securitySolution',
      definition: 'name: priority\nlabel: Priority\ncontrol: INPUT_TEXT\ntype: keyword\n',
    };

    const buildCaseSO = (
      overrides: Partial<CaseSavedObjectTransformed['attributes']> = {}
    ): CaseSavedObjectTransformed => ({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        extended_fields: { priority_as_keyword: 'high' },
        template: null,
        ...overrides,
      },
    });

    const withTemplatesEnabled = () => {
      const args = createCasesClientMockArgs();
      args.config = { ...args.config, templates: { enabled: true } };
      args.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(new Map());
      args.services.fieldDefinitionsService.getGlobalFieldDefinitionsForSearch.mockResolvedValue([
        globalFieldDef,
      ]);
      return args;
    };

    describe('get', () => {
      it('does not enrich when templates are disabled', async () => {
        const args = createCasesClientMockArgs();
        args.config = { ...args.config, templates: { enabled: false } };
        args.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(new Map());
        args.services.caseService.getCase.mockResolvedValue(buildCaseSO());

        const result = await get({ id: 'mock-id-1', includeComments: false }, args);

        expect(result.extended_fields_labels).toBeUndefined();
        expect(
          args.services.fieldDefinitionsService.getGlobalFieldDefinitionsForSearch
        ).not.toHaveBeenCalled();
      });

      it('does not fetch definitions when the case has no extended fields', async () => {
        const args = withTemplatesEnabled();
        args.services.caseService.getCase.mockResolvedValue(
          buildCaseSO({ extended_fields: undefined })
        );

        const result = await get({ id: 'mock-id-1', includeComments: false }, args);

        expect(result.extended_fields_labels).toBeUndefined();
        expect(
          args.services.fieldDefinitionsService.getGlobalFieldDefinitionsForSearch
        ).not.toHaveBeenCalled();
      });

      it('enriches global field labels and skips the template fetch when the case has no template', async () => {
        const args = withTemplatesEnabled();
        args.services.caseService.getCase.mockResolvedValue(buildCaseSO());

        const result = await get({ id: 'mock-id-1', includeComments: false }, args);

        expect(result.extended_fields_labels).toEqual({ priority_as_keyword: 'Priority' });
        expect(args.services.templatesService.getTemplate).not.toHaveBeenCalled();
      });

      it('fetches only the case template version and applies its field labels', async () => {
        const args = withTemplatesEnabled();
        args.services.caseService.getCase.mockResolvedValue(
          buildCaseSO({ template: { id: 'tmpl-1', version: 2 } })
        );
        args.services.templatesService.getTemplate.mockResolvedValue({
          attributes: {
            templateId: 'tmpl-1',
            templateVersion: 2,
            fieldDefinitions: [
              { name: 'sev', type: 'keyword', label: 'Severity', control: 'SELECT_BASIC' },
            ],
          },
        } as unknown as SavedObject<Template>);

        const result = await get({ id: 'mock-id-1', includeComments: false }, args);

        expect(args.services.templatesService.getTemplate).toHaveBeenCalledWith('tmpl-1', '2');
        expect(
          args.services.templatesService.getTemplateVersionsForExtendedFieldSearch
        ).not.toHaveBeenCalled();
        expect(result.extended_fields_labels).toEqual({
          priority_as_keyword: 'Priority',
          sev_as_keyword: 'Severity',
        });
        expect(result.extended_fields_controls).toEqual({
          priority_as_keyword: 'INPUT_TEXT',
          sev_as_keyword: 'SELECT_BASIC',
        });
      });

      it('returns the un-enriched case (and warns) when enrichment fails', async () => {
        const args = withTemplatesEnabled();
        args.services.caseService.getCase.mockResolvedValue(buildCaseSO());
        args.services.fieldDefinitionsService.getGlobalFieldDefinitionsForSearch.mockRejectedValue(
          new Error('boom')
        );

        const result = await get({ id: 'mock-id-1', includeComments: false }, args);

        expect(result.extended_fields_labels).toBeUndefined();
        expect(result.id).toBe('mock-id-1');
        expect(args.logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to enrich case id: mock-id-1')
        );
      });
    });

    describe('resolve', () => {
      it('enriches the resolved case with field labels', async () => {
        const args = withTemplatesEnabled();
        args.services.caseService.getResolveCase.mockResolvedValue({
          saved_object: buildCaseSO(),
          outcome: 'exactMatch',
        });

        const { case: theCase } = await resolve({ id: 'mock-id-1', includeComments: false }, args);

        expect(theCase.extended_fields_labels).toEqual({ priority_as_keyword: 'Priority' });
      });
    });
  });

  describe('includeComments', () => {
    type LegacyCommentAttributes = Extract<
      (typeof mockCaseComments)[0]['attributes'],
      { comment: string }
    >;
    const legacyComment = mockCaseComments[0].attributes as LegacyCommentAttributes;

    const legacyCommentsFindResponse = (): SavedObjectsFindResponse<AttachmentAttributes> => ({
      saved_objects: [{ ...mockCaseComments[0], score: 1 }],
      total: 1,
      per_page: 10,
      page: 1,
    });

    it('get() upgrades a legacy-stored comment to unified', async () => {
      const args = createCasesClientMockArgs();
      args.services.caseService.getCase.mockResolvedValue(mockCases[0]);
      args.services.caseService.getAllCaseComments.mockResolvedValue(legacyCommentsFindResponse());

      const result = await get({ id: 'mock-id-1', includeComments: true }, args);

      expect(result.comments).toEqual([
        expect.objectContaining({
          type: 'comment',
          data: { content: legacyComment.comment },
        }),
      ]);
    });

    it('resolve() upgrades a legacy-stored comment to unified', async () => {
      const args = createCasesClientMockArgs();
      args.services.caseService.getResolveCase.mockResolvedValue({
        saved_object: mockCases[0],
        outcome: 'exactMatch',
      });
      args.services.caseService.getAllCaseComments.mockResolvedValue(legacyCommentsFindResponse());

      const { case: theCase } = await resolve({ id: 'mock-id-1', includeComments: true }, args);

      expect(theCase.comments).toEqual([
        expect.objectContaining({
          type: 'comment',
          data: { content: legacyComment.comment },
        }),
      ]);
    });
  });
});

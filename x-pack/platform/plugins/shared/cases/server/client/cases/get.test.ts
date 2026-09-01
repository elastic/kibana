/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { Template } from '../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { get, resolve, getCasesByAlertID, getTags, getReporters, getCategories } from './get';

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
      ).rejects.toThrow('invalid keys "foo"');
    });
  });

  describe('getTags', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getTags({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getReporters', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getReporters({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getCategories', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getCategories({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
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
});

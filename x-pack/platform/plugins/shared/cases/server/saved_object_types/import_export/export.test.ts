/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import type { SavedObject, SavedObjectsExportTransformContext } from '@kbn/core/server';
import { handleExport } from './export';
import { mockCases } from '../../mocks';
import type { CasePersistedAttributes, CaseSavedObjectTransformed } from '../../common/types/case';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
} from '../../../common/constants';
import {
  getAttachmentsAndUserActionsForCases,
  getTemplatesAndFieldDefinitionsForCases,
} from './utils';

jest.mock('./utils', () => {
  return {
    getAttachmentsAndUserActionsForCases: jest.fn().mockResolvedValue([]),
    getTemplatesAndFieldDefinitionsForCases: jest.fn().mockResolvedValue([]),
  };
});

describe('case export', () => {
  const testRequest = httpServerMock.createFakeKibanaRequest({});
  const testContext: SavedObjectsExportTransformContext = { request: testRequest };
  const logger = loggingSystemMock.createLogger();
  const config = {
    attachments: { enabled: true },
  } as never;
  const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case, idx) => ({
    ..._case,
    attributes: {
      ..._case.attributes,
      incremental_id: idx + 1,
    },
  }));

  it('should remove `incremental_id` from cases when exporting', async () => {
    const exported = await handleExport({
      context: testContext,
      coreSetup: coreMock.createSetup(),
      objects: testCases as unknown as Array<SavedObject<CasePersistedAttributes>>,
      logger,
      config,
    });

    const containsIncrementalId = exported.some((exportedCase) => {
      return (
        'incremental_id' in exportedCase.attributes &&
        exportedCase.attributes.incremental_id !== undefined
      );
    });

    expect(containsIncrementalId).toBeFalsy();
  });

  it.each([
    ['flag on', { attachments: { enabled: true } } as never],
    ['flag off', { attachments: { enabled: false } } as never],
  ])(
    'includes cases-attachments in the scoped client and export query regardless of the feature flag (%s)',
    async (_label, configForCase) => {
      const coreSetup = coreMock.createSetup();

      await handleExport({
        context: testContext,
        coreSetup,
        // @ts-ignore: mock objects are not matching persisted objects
        objects: testCases,
        logger,
        config: configForCase,
      });

      const [coreStart] = await coreSetup.getStartServices();

      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(
        testRequest,
        expect.objectContaining({
          includedHiddenTypes: expect.arrayContaining([CASE_ATTACHMENT_SAVED_OBJECT]),
        })
      );
      expect(getAttachmentsAndUserActionsForCases).toHaveBeenCalledWith(
        expect.anything(),
        testCases.map((testCase) => testCase.id)
      );
    }
  );

  it.each([
    ['templates flag on', { templates: { enabled: true } } as never],
    ['templates flag off', { templates: { enabled: false } } as never],
  ])(
    'includes cases-templates and cases-field-definition in the scoped client regardless of the templates feature flag (%s)',
    async (_label, configForCase) => {
      const coreSetup = coreMock.createSetup();

      await handleExport({
        context: testContext,
        coreSetup,
        // @ts-ignore: mock objects are not matching persisted objects
        objects: testCases,
        logger,
        config: configForCase,
      });

      const [coreStart] = await coreSetup.getStartServices();

      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(
        testRequest,
        expect.objectContaining({
          includedHiddenTypes: expect.arrayContaining([
            CASE_TEMPLATE_SAVED_OBJECT,
            CASE_FIELD_DEFINITION_SAVED_OBJECT,
          ]),
        })
      );
    }
  );

  it('appends templates and field definitions from getTemplatesAndFieldDefinitionsForCases to the export', async () => {
    const mockTemplateSO = {
      id: 'tmpl-so-1',
      type: CASE_TEMPLATE_SAVED_OBJECT,
      attributes: { templateId: 'tmpl-abc', name: 'My Template', owner: 'securitySolution' },
      references: [],
    };
    const mockFieldDefSO = {
      id: 'fd-so-1',
      type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
      attributes: { name: 'incident_type', owner: 'securitySolution' },
      references: [],
    };

    (getTemplatesAndFieldDefinitionsForCases as jest.Mock).mockResolvedValueOnce([
      mockTemplateSO,
      mockFieldDefSO,
    ]);

    const coreSetup = coreMock.createSetup();
    const exported = await handleExport({
      context: testContext,
      coreSetup,
      objects: testCases as unknown as Array<SavedObject<CasePersistedAttributes>>,
      logger,
      config,
    });

    expect(exported).toContainEqual(expect.objectContaining({ id: 'tmpl-so-1' }));
    expect(exported).toContainEqual(expect.objectContaining({ id: 'fd-so-1' }));
  });

  it('calls getTemplatesAndFieldDefinitionsForCases with the cleaned case objects and logger', async () => {
    const coreSetup = coreMock.createSetup();

    await handleExport({
      context: testContext,
      coreSetup,
      objects: testCases as unknown as Array<SavedObject<CasePersistedAttributes>>,
      logger,
      config,
    });

    expect(getTemplatesAndFieldDefinitionsForCases).toHaveBeenCalledWith(
      expect.anything(),
      // cleaned objects should have incremental_id stripped (undefined)
      expect.arrayContaining([
        expect.objectContaining({
          attributes: expect.objectContaining({ incremental_id: undefined }),
        }),
      ]),
      logger
    );
  });
});

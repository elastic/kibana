/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TITLE_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CUSTOM_FIELDS_PER_CASE,
} from '../../../common/constants';
import type { CasePostRequest } from '../../../common';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { create } from './create';
import { CaseSeverity, ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';

import type { CaseCustomFields } from '../../../common/types/domain';
import { omit } from 'lodash';

describe('create', () => {
  const theCase = {
    title: 'My Case',
    tags: [],
    description: 'testing sir',
    connector: {
      id: '.none',
      name: 'None',
      type: ConnectorTypes.none,
      fields: null,
    },
    settings: { syncAlerts: true },
    severity: CaseSeverity.LOW,
    owner: SECURITY_SOLUTION_OWNER,
    assignees: [{ uid: '1' }],
  };

  const caseSO = mockCases[0];
  const casesClientMock = createCasesClientMock();
  casesClientMock.configure.get = jest.fn().mockResolvedValue([]);

  describe('workflow events', () => {
    it('emits a caseCreated event on successful create', async () => {
      const clientArgs = createCasesClientMockArgs();

      clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

      await create(theCase, clientArgs, casesClientMock);

      expect(clientArgs.casesEventBus.emitCaseCreated).toHaveBeenCalledWith(clientArgs.request, {
        caseId: caseSO.id,
        owner: caseSO.attributes.owner,
      });
    });
  });

  describe('Assignees', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('notifies single assignees', async () => {
      await create(theCase, clientArgs, casesClientMock);

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: theCase.assignees,
        theCase: caseSO,
      });
    });

    it('notifies multiple assignees', async () => {
      await create(
        { ...theCase, assignees: [{ uid: '1' }, { uid: '2' }] },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: [{ uid: '1' }, { uid: '2' }],
        theCase: caseSO,
      });
    });

    it('does not notify when there are no assignees', async () => {
      await create({ ...theCase, assignees: [] }, clientArgs, casesClientMock);

      expect(clientArgs.services.notificationService.notifyAssignees).not.toHaveBeenCalled();
    });

    it('does not notify the current user', async () => {
      await create(
        {
          ...theCase,
          assignees: [{ uid: '1' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: [{ uid: '1' }],
        theCase: caseSO,
      });
    });

    it('should throw an error if the assignees array length is too long', async () => {
      const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foo' });

      await expect(create({ ...theCase, assignees }, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to create case: Error: The length of the field assignees is too long. Array must be of length <= ${MAX_ASSIGNEES_PER_CASE}.`
      );
    });

    it('should throw if the user does not have the correct license', async () => {
      clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(false);

      await expect(create(theCase, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to create case: Error: In order to assign users to cases, you must be subscribed to an Elastic Platinum license`
      );
    });

    it('validates with assign+create operations when cases have assignees', async () => {
      clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(true);
      await create(theCase, clientArgs, casesClientMock);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: [
            {
              action: 'cases_assign',
              docType: 'case',
              ecsType: 'change',
              name: 'assignCase',
              savedObjectType: 'cases',
              verbs: { past: 'updated', present: 'update', progressive: 'updating' },
            },
            {
              action: 'case_create',
              docType: 'case',
              ecsType: 'creation',
              name: 'createCase',
              savedObjectType: 'cases',
              verbs: { past: 'created', present: 'create', progressive: 'creating' },
            },
          ],
        })
      );
    });

    it('validates with only create operation when cases have no assignees', async () => {
      await create({ ...theCase, assignees: [] }, clientArgs, casesClientMock);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: {
            action: 'case_create',
            docType: 'case',
            ecsType: 'creation',
            name: 'createCase',
            savedObjectType: 'cases',
            verbs: { past: 'created', present: 'create', progressive: 'creating' },
          },
        })
      );
    });

    it('should filter out empty assignees', async () => {
      await create(
        { ...theCase, assignees: [{ uid: '' }, { uid: '1' }] },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            assignees: [{ uid: '1' }],
          }),
        })
      );
    });
  });

  describe('Attributes', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw an error when an excess field exists', async () => {
      await expect(
        // @ts-expect-error foo is an invalid field
        create({ ...theCase, foo: 'bar' }, clientArgs, casesClientMock)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: invalid keys \\"foo\\""`
      );
    });
  });

  describe('title', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`should not throw an error if the title is non empty and less than ${MAX_TITLE_LENGTH} characters`, async () => {
      await expect(
        create({ ...theCase, title: 'This is a test case!!' }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the title length is too long', async () => {
      await expect(
        create(
          {
            ...theCase,
            title:
              'This is a very long title with more than one hundred and sixty characters!! To confirm the maximum limit error thrown for more than one hundred and sixty characters!!',
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
      );
    });

    it('should throw an error if the title is an empty string', async () => {
      await expect(create({ ...theCase, title: '' }, clientArgs, casesClientMock)).rejects.toThrow(
        'Failed to create case: Error: The title field cannot be an empty string.'
      );
    });

    it('should throw an error if the title is a string with empty characters', async () => {
      await expect(
        create({ ...theCase, title: '   ' }, clientArgs, casesClientMock)
      ).rejects.toThrow('Failed to create case: Error: The title field cannot be an empty string.');
    });

    it('should trim title', async () => {
      await create({ ...theCase, title: 'title with spaces      ' }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            title: 'title with spaces',
          }),
        })
      );
    });
  });

  describe('description', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`should not throw an error if the description is non empty and less than ${MAX_DESCRIPTION_LENGTH} characters`, async () => {
      await expect(
        create(
          { ...theCase, description: 'This is a test description!!' },
          clientArgs,
          casesClientMock
        )
      ).resolves.not.toThrow();
    });

    it('should throw an error if the description length is too long', async () => {
      const description = Array(MAX_DESCRIPTION_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        create({ ...theCase, description }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH}.`
      );
    });

    it('should throw an error if the description is an empty string', async () => {
      await expect(
        create({ ...theCase, description: '' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The description field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        create({ ...theCase, description: '   ' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The description field cannot be an empty string.'
      );
    });

    it('should trim description', async () => {
      await create(
        { ...theCase, description: 'this is a description with spaces!!      ' },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            description: 'this is a description with spaces!!',
          }),
        })
      );
    });
  });

  describe('tags', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not throw an error if the tags array is empty', async () => {
      await expect(
        create({ ...theCase, tags: [] }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should not throw an error if the tags array has non empty string within limit', async () => {
      await expect(
        create({ ...theCase, tags: ['abc'] }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the tags array length is too long', async () => {
      const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foo');

      await expect(create({ ...theCase, tags }, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to create case: Error: The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_PER_CASE}.`
      );
    });

    it('should throw an error if the tags array has empty string', async () => {
      await expect(create({ ...theCase, tags: [''] }, clientArgs, casesClientMock)).rejects.toThrow(
        'Failed to create case: Error: The tag field cannot be an empty string.'
      );
    });

    it('should throw an error if the tags array has string with empty characters', async () => {
      await expect(
        create({ ...theCase, tags: ['  '] }, clientArgs, casesClientMock)
      ).rejects.toThrow('Failed to create case: Error: The tag field cannot be an empty string.');
    });

    it('should throw an error if the tag length is too long', async () => {
      const tag = Array(MAX_LENGTH_PER_TAG + 1)
        .fill('f')
        .toString();

      await expect(
        create({ ...theCase, tags: [tag] }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the tag is too long. The maximum length is ${MAX_LENGTH_PER_TAG}.`
      );
    });

    it('should trim tags', async () => {
      await create({ ...theCase, tags: ['pepsi     ', 'coke'] }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            tags: ['pepsi', 'coke'],
          }),
        })
      );
    });
  });

  describe('Category', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not throw an error if the category is null', async () => {
      await expect(
        create({ ...theCase, category: null }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the category length is too long', async () => {
      await expect(
        create(
          { ...theCase, category: 'A very long category with more than fifty characters!' },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow('Failed to create case: Error: The length of the category is too long.');
    });

    it('should throw an error if the category is an empty string', async () => {
      await expect(
        create({ ...theCase, category: '' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The category field cannot be an empty string.,Invalid value "" supplied to "category"'
      );
    });

    it('should throw an error if the category is a string with empty characters', async () => {
      await expect(
        create({ ...theCase, category: '   ' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The category field cannot be an empty string.,Invalid value "   " supplied to "category"'
      );
    });

    it('should trim category', async () => {
      await create({ ...theCase, category: 'reporting       ' }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            category: 'reporting',
          }),
        })
      );
    });
  });

  describe('Custom Fields', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    const casesClient = createCasesClientMock();
    const defaultCustomFieldsConfiguration = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        label: 'label 1',
        required: true,
        defaultValue: 'default value',
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        label: 'label 2',
        required: false,
      },
    ];

    const theCustomFields: CaseCustomFields = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        value: 'this is a text field value',
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        value: true,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: defaultCustomFieldsConfiguration,
        },
      ]);
    });

    it('should create customFields correctly', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: theCustomFields,
          },
          clientArgs,
          casesClient
        )
      ).resolves.not.toThrow();

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            customFields: theCustomFields,
          }),
        })
      );
    });

    it('fills out missing required custom fields', async () => {
      await expect(create({ ...theCase }, clientArgs, casesClient)).resolves.not.toThrow();

      expect(clientArgs.services.caseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            customFields: [
              { key: 'first_key', type: 'text', value: 'default value' },
              { key: 'second_key', type: 'toggle', value: null },
            ],
          }),
        })
      );
    });

    it('should throw an error when required customFields are null', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            {
              ...defaultCustomFieldsConfiguration[0],
              label: 'missing field 1',
            },
            {
              ...defaultCustomFieldsConfiguration[1],
              label: 'missing field 2',
              required: true,
              defaultValue: false,
            },
          ],
        },
      ]);

      await expect(
        create(
          {
            ...theCase,
            customFields: [
              { ...theCustomFields[0], value: null },
              { ...theCustomFields[1], value: null },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: Invalid value \\"null\\" supplied for the following required custom fields: \\"missing field 1\\", \\"missing field 2\\""`
      );
    });

    it('should throw an error when required customFields are undefined and missing a default value', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            {
              ...defaultCustomFieldsConfiguration[0],
              label: 'missing field 1',
              defaultValue: undefined,
            },
            {
              ...defaultCustomFieldsConfiguration[1],
              label: 'missing field 2',
              required: true,
            },
          ],
        },
      ]);

      await expect(
        create({ ...theCase }, clientArgs, casesClient)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: Missing required custom fields without default value configured: \\"missing field 1\\", \\"missing field 2\\""`
      );
    });

    it('throws error when the customFields array is too long', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill(theCustomFields[0]),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: The length of the field customFields is too long. Array must be of length <= 10."`
      );
    });

    it('throws with duplicated customFields keys', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: [
              {
                key: 'duplicated_key',
                type: CustomFieldTypes.TEXT,
                value: 'this is a text field value',
              },
              {
                key: 'duplicated_key',
                type: CustomFieldTypes.TOGGLE,
                value: true,
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: Invalid duplicated customFields keys in request: duplicated_key"`
      );
    });

    it('throws error when customFields keys are not present in configuration', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: [
              {
                key: 'missing_key',
                type: CustomFieldTypes.TEXT,
                value: null,
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: Invalid custom field keys: missing_key"`
      );
    });

    it('throws when the customField types do not match the configuration', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: [
              {
                key: 'first_key',
                type: CustomFieldTypes.TOGGLE,
                value: true,
              },
              {
                key: 'second_key',
                type: CustomFieldTypes.TEXT,
                value: 'foobar',
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: The following custom fields have the wrong type in the request: \\"label 1\\", \\"label 2\\""`
      );
    });
  });

  describe('User actions', () => {
    const caseWithOnlyRequiredFields = omit(theCase, [
      'assignees',
      'category',
      'severity',
      'customFields',
    ]) as CasePostRequest;

    const caseWithOptionalFields: CasePostRequest = {
      ...theCase,
      category: 'My category',
      severity: CaseSeverity.CRITICAL,
      customFields: [
        {
          key: 'first_customField_key',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value',
        },
        {
          key: 'second_customField_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    casesClient.configure.get = jest.fn().mockResolvedValue([
      {
        owner: caseWithOptionalFields.owner,
        customFields: [
          {
            key: 'first_customField_key',
            type: CustomFieldTypes.TEXT,
            label: 'foo',
            required: false,
          },
          {
            key: 'second_customField_key',
            type: CustomFieldTypes.TOGGLE,
            label: 'foo',
            required: false,
          },
        ],
      },
    ]);

    it('should create a user action with defaults correctly', async () => {
      await create(caseWithOnlyRequiredFields, clientArgs, casesClient);

      expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: {
          caseId: 'mock-id-1',
          owner: 'securitySolution',
          payload: {
            assignees: [],
            category: null,
            connector: { fields: null, id: '.none', name: 'None', type: '.none' },
            customFields: [],
            description: 'testing sir',
            owner: 'securitySolution',
            settings: { syncAlerts: true },
            severity: 'low',
            tags: [],
            title: 'My Case',
          },
          type: 'create_case',
          user: {
            email: 'damaged_raccoon@elastic.co',
            full_name: 'Damaged Raccoon',
            profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
            username: 'damaged_raccoon',
          },
        },
      });
    });

    it('should create a user action with optional fields set correctly', async () => {
      await create(caseWithOptionalFields, clientArgs, casesClient);

      expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: {
          caseId: 'mock-id-1',
          owner: 'securitySolution',
          payload: {
            assignees: [{ uid: '1' }],
            category: 'My category',
            connector: { fields: null, id: '.none', name: 'None', type: '.none' },
            customFields: caseWithOptionalFields.customFields,
            description: 'testing sir',
            owner: 'securitySolution',
            settings: { syncAlerts: true },
            severity: 'critical',
            tags: [],
            title: 'My Case',
          },
          type: 'create_case',
          user: {
            email: 'damaged_raccoon@elastic.co',
            full_name: 'Damaged Raccoon',
            profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
            username: 'damaged_raccoon',
          },
        },
      });
    });
  });

  describe('Template usage stats', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    // The templates flag defaults to on, so create() expands the referenced template before
    // bumping usage stats — mock the SO read so expansion resolves and the stats call is reached.
    const usageTemplateSO = {
      id: 'so-tmpl-1',
      type: 'cases-templates',
      references: [],
      attributes: {
        templateId: 'tmpl-1',
        name: 'Usage Template',
        owner: SECURITY_SOLUTION_OWNER,
        definition: yamlStringify({ name: 'Usage Template', fields: [] }),
        templateVersion: 1,
        deletedAt: null,
        isLatest: true,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(usageTemplateSO as never);
    });

    it('increments template usage stats when a case is created with a template', async () => {
      const caseWithTemplate = {
        ...theCase,
        template: { id: 'tmpl-1', version: 1 },
      };

      await create(caseWithTemplate, clientArgs, casesClientMock);

      expect(clientArgs.services.templatesService.incrementUsageStats).toHaveBeenCalledWith(
        'tmpl-1'
      );
    });

    it('does not increment template usage stats when no template is provided', async () => {
      await create(theCase, clientArgs, casesClientMock);

      expect(clientArgs.services.templatesService.incrementUsageStats).not.toHaveBeenCalled();
    });

    it('does not fail case creation when template stats update fails', async () => {
      clientArgs.services.templatesService.incrementUsageStats.mockRejectedValueOnce(
        new Error('stats update failed')
      );

      const caseWithTemplate = {
        ...theCase,
        template: { id: 'tmpl-1', version: 1 },
      };

      await expect(create(caseWithTemplate, clientArgs, casesClientMock)).resolves.not.toThrow();
      expect(clientArgs.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update template usage stats')
      );
    });
  });

  describe('extended_fields validation', () => {
    const makeFieldDef = (name: string, type: string, isGlobal = true) => ({
      fieldDefinitionId: `fd-${name}`,
      name,
      owner: SECURITY_SOLUTION_OWNER,
      description: '',
      isGlobal,
      definition: yamlStringify({ name, type, control: 'INPUT_TEXT', label: name }),
    });

    const makeTemplateSO = (fields: object[]) => ({
      id: 'so-tpl',
      type: 'cases-templates',
      references: [],
      attributes: {
        templateId: 'tmpl-ext',
        name: 'Ext Template',
        owner: SECURITY_SOLUTION_OWNER,
        definition: yamlStringify({ name: 'Ext Template', fields }),
        templateVersion: 1,
        deletedAt: null,
        isLatest: true,
      },
    });

    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
    });

    it('creates a case with global extended_fields when no template is selected', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [makeFieldDef('risk_score', 'keyword')],
        total: 1,
      });

      await expect(
        create(
          { ...theCase, extended_fields: { risk_score_as_keyword: 'high' } },
          clientArgs,
          casesClientMock
        )
      ).resolves.not.toThrow();
    });

    it('throws when a non-global extended_fields key is provided with no template', async () => {
      // fieldDefinitionsService returns empty — no global keys registered
      await expect(
        create(
          { ...theCase, extended_fields: { risk_score_as_keyword: 'high' } },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'extended_fields keys [risk_score_as_keyword] are not global (isGlobal) field definitions'
      );
    });

    it('creates a case with mixed global + template extended_fields when a template is set', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [makeFieldDef('global_tag', 'keyword')],
        total: 1,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(
        makeTemplateSO([
          { control: 'INPUT_TEXT', name: 'summary', label: 'Summary', type: 'keyword' },
        ])
      );

      await expect(
        create(
          {
            ...theCase,
            template: { id: 'tmpl-ext', version: 1 },
            extended_fields: {
              global_tag_as_keyword: 'security',
              summary_as_keyword: 'hello',
            },
          },
          clientArgs,
          casesClientMock
        )
      ).resolves.not.toThrow();
    });

    it('throws when a required global field value is empty (no template)', async () => {
      // FAILURE SCENARIO: client stores an empty string under a required global field
      // with no template. Previously this bypassed validateExtendedFields.
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          makeFieldDef('risk_score', 'keyword'),
          // Override definition to include required validation
          {
            ...makeFieldDef('risk_score', 'keyword'),
            definition: yamlStringify({
              name: 'risk_score',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Risk Score',
              validation: { required: true },
            }),
          },
        ].slice(1), // only the one with required
        total: 1,
      });

      await expect(
        create(
          { ...theCase, extended_fields: { risk_score_as_keyword: '' } },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow('Invalid extended_fields');
    });

    it('throws when the template is not found', async () => {
      // FAILURE SCENARIO: create path with a template id that does not exist.
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(undefined);

      await expect(
        create(
          {
            ...theCase,
            template: { id: 'missing-tmpl', version: 1 },
            extended_fields: { summary_as_keyword: 'hello' },
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow('Template missing-tmpl not found');
    });

    it('throws when the template definition is invalid', async () => {
      // FAILURE SCENARIO: template SO exists but its YAML definition is malformed.
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue({
        id: 'so-tpl',
        type: 'cases-templates',
        references: [],
        attributes: {
          templateId: 'tmpl-ext',
          name: 'Bad Template',
          owner: SECURITY_SOLUTION_OWNER,
          definition: ': {not valid yaml',
          templateVersion: 1,
          deletedAt: null,
          isLatest: true,
        },
      });

      await expect(
        create(
          {
            ...theCase,
            template: { id: 'tmpl-ext', version: 1 },
            extended_fields: { summary_as_keyword: 'hello' },
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow('Template tmpl-ext has an invalid definition');
    });
  });

  describe('customFields → extended_fields adapter (write-time mirror)', () => {
    const adapterCustomFieldsCfg = [
      { key: 'priority', type: CustomFieldTypes.TEXT, label: 'Priority', required: false },
      { key: 'count', type: CustomFieldTypes.NUMBER, label: 'Count', required: false },
    ];

    const customFields: CaseCustomFields = [
      { key: 'priority', type: CustomFieldTypes.TEXT, value: 'high' },
      { key: 'count', type: CustomFieldTypes.NUMBER, value: 5 },
    ];

    const adapterCasesClientMock = createCasesClientMock();

    beforeEach(() => {
      jest.clearAllMocks();
      adapterCasesClientMock.configure.get = jest
        .fn()
        .mockResolvedValue([{ owner: theCase.owner, customFields: adapterCustomFieldsCfg }]);
    });

    it('mirrors customFields into extended_fields when templates flag is enabled', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

      await create({ ...theCase, customFields }, clientArgs, adapterCasesClientMock);

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.extended_fields).toMatchObject({
        priority_as_keyword: 'high',
        count_as_integer: '5',
      });
    });

    it('does not mirror customFields into extended_fields when templates flag is disabled', async () => {
      // FAILURE SCENARIO: adapter runs unconditionally — extended_fields written when flag is off.
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: false } };
      clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

      await create({ ...theCase, customFields }, clientArgs, adapterCasesClientMock);

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.extended_fields).toBeUndefined();
    });

    it('overrides explicit extended_fields values when customField is also set (customFields-win)', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-priority',
            name: 'priority',
            owner: SECURITY_SOLUTION_OWNER,
            description: '',
            isGlobal: true,
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
          },
        ],
        total: 1,
      });
      clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

      await create(
        {
          ...theCase,
          customFields: [{ key: 'priority', type: CustomFieldTypes.TEXT, value: 'low' }],
          // Pre-set v2 value — customFields wins and overrides it.
          extended_fields: { priority_as_keyword: 'critical' },
        },
        clientArgs,
        adapterCasesClientMock
      );

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.extended_fields?.priority_as_keyword).toBe('low');
    });

    it('preserves a mirror key for a customField absent from the request (synthetic-null regression)', async () => {
      // FAILURE SCENARIO (before fix): fillMissingCustomFields pads { key: 'priority', value: null }
      // for the absent 'priority' field; the merge then deletes priority_as_keyword — even though
      // the request never submitted priority. Fix: mirror only request-provided customFields.
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-priority',
            name: 'priority',
            owner: SECURITY_SOLUTION_OWNER,
            description: '',
            isGlobal: true,
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
          },
        ],
        total: 1,
      });
      clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);

      await create(
        {
          ...theCase,
          // Only count is provided — priority is absent from the request.
          customFields: [{ key: 'count', type: CustomFieldTypes.NUMBER, value: 5 }],
          // priority_as_keyword pre-set by a template default in extended_fields.
          extended_fields: { priority_as_keyword: 'crit' },
        },
        clientArgs,
        adapterCasesClientMock
      );

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      // priority was not submitted — its mirror key must be preserved.
      expect(createArgs.attributes.extended_fields?.priority_as_keyword).toBe('crit');
      // count was submitted — it must still be mirrored.
      expect(createArgs.attributes.extended_fields?.count_as_integer).toBe('5');
    });
  });

  describe('server-side template expansion', () => {
    const templateDefinition = yamlStringify({
      name: 'Template default title',
      severity: 'high',
      category: 'events',
      tags: ['template-tag'],
      assignees: [{ uid: 'template-assignee' }],
      fields: [
        {
          name: 'priority',
          type: 'keyword',
          control: 'INPUT_TEXT',
          label: 'Priority',
          metadata: { default: 'medium' },
        },
      ],
    });

    const templateSO = {
      id: 'so-tpl',
      type: 'cases-templates',
      references: [],
      attributes: {
        templateId: 'tmpl-exp',
        name: 'Expansion Template',
        owner: SECURITY_SOLUTION_OWNER,
        definition: templateDefinition,
        templateVersion: 4,
        deletedAt: null,
        isLatest: true,
      },
    };

    // theCase fixture pins severity/assignees; strip them so the template defaults apply.
    const minimalRequest = omit(theCase, ['severity', 'assignees']);

    const expansionCasesClientMock = createCasesClientMock();
    expansionCasesClientMock.configure.get = jest.fn().mockResolvedValue([]);

    const createClientArgs = ({ templatesEnabled = true } = {}) => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: templatesEnabled } };
      clientArgs.services.caseService.createCase.mockResolvedValue(caseSO);
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(templateSO);
      clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(true);
      return clientArgs;
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('expands template defaults into the persisted case and pins the resolved version', async () => {
      const clientArgs = createClientArgs();

      await create(
        { ...minimalRequest, template: { id: 'tmpl-exp' } },
        clientArgs,
        expansionCasesClientMock
      );

      expect(clientArgs.services.templatesService.getTemplate).toHaveBeenCalledWith(
        'tmpl-exp',
        undefined,
        { includeDeleted: false }
      );

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.template).toEqual({ id: 'tmpl-exp', version: 4 });
      expect(createArgs.attributes.severity).toBe(CaseSeverity.HIGH);
      expect(createArgs.attributes.category).toBe('events');
      expect(createArgs.attributes.tags).toEqual(['template-tag']);
      expect(createArgs.attributes.assignees).toEqual([{ uid: 'template-assignee' }]);
      expect(createArgs.attributes.extended_fields).toEqual({ priority_as_keyword: 'medium' });
      // Required on the wire — the template's default title never applies.
      expect(createArgs.attributes.title).toBe('My Case');
    });

    it('caller-sent values win over template defaults', async () => {
      const clientArgs = createClientArgs();

      await create(
        {
          ...minimalRequest,
          template: { id: 'tmpl-exp', version: 4 },
          severity: CaseSeverity.CRITICAL,
          extended_fields: { priority_as_keyword: 'urgent' },
        },
        clientArgs,
        expansionCasesClientMock
      );

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.severity).toBe(CaseSeverity.CRITICAL);
      expect(createArgs.attributes.extended_fields).toEqual({ priority_as_keyword: 'urgent' });
    });

    it('records the expanded (not raw) request on the create_case user action', async () => {
      const clientArgs = createClientArgs();

      await create(
        { ...minimalRequest, template: { id: 'tmpl-exp' } },
        clientArgs,
        expansionCasesClientMock
      );

      const [[userActionArgs]] =
        clientArgs.services.userActionService.creator.createUserAction.mock.calls;
      // The create_case payload carries the expanded case defaults (severity here). It does NOT
      // carry template / extended_fields — CreateCaseUserActionRt strips them — so those are
      // audited via dedicated user actions (asserted below), not on this payload.
      expect(userActionArgs.userAction.payload).toMatchObject({
        severity: CaseSeverity.HIGH,
      });
    });

    it('emits template and extended_fields user actions so the audit trail matches the persisted case', async () => {
      const clientArgs = createClientArgs();

      await create(
        { ...minimalRequest, template: { id: 'tmpl-exp' } },
        clientArgs,
        expansionCasesClientMock
      );

      const [[bulkArgs]] =
        clientArgs.services.userActionService.creator.bulkCreateUserAction.mock.calls;
      const byType: Record<string, { payload: unknown }> = Object.fromEntries(
        bulkArgs.userActions.map((ua: { type: string; payload: unknown }) => [ua.type, ua])
      );

      // The applied template is recorded with its resolved (point-in-time) name (the SO
      // attribute name, not the definition's default case title).
      expect(byType.template.payload).toEqual({
        template: { id: 'tmpl-exp', version: 4, name: 'Expansion Template' },
      });
      // The initial extended_fields are recorded exactly as persisted on the case SO.
      expect(byType.extended_fields.payload).toEqual({
        extended_fields: { priority_as_keyword: 'medium' },
      });
    });

    it('checks the assignCase operation when the template introduces assignees', async () => {
      const clientArgs = createClientArgs();

      await create(
        { ...minimalRequest, template: { id: 'tmpl-exp' } },
        clientArgs,
        expansionCasesClientMock
      );

      // First call: createCase only (raw request has no assignees). Second: assignCase for
      // the template-introduced assignees.
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenLastCalledWith(
        expect.objectContaining({ operation: expect.objectContaining({ name: 'assignCase' }) })
      );
    });

    it('skips template assignees silently without a Platinum license', async () => {
      const clientArgs = createClientArgs();
      clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(false);

      await create(
        { ...minimalRequest, template: { id: 'tmpl-exp' } },
        clientArgs,
        expansionCasesClientMock
      );

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.assignees).toEqual([]);
      // Other template defaults still apply.
      expect(createArgs.attributes.severity).toBe(CaseSeverity.HIGH);
    });

    it('rejects an unknown template', async () => {
      const clientArgs = createClientArgs();
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(undefined);

      await expect(
        create(
          { ...minimalRequest, template: { id: 'missing' } },
          clientArgs,
          expansionCasesClientMock
        )
      ).rejects.toThrow('Template missing not found');
    });

    it('rejects a cross-owner template with the same not-found error', async () => {
      const clientArgs = createClientArgs();
      clientArgs.services.templatesService.getTemplate.mockResolvedValue({
        ...templateSO,
        attributes: { ...templateSO.attributes, owner: 'observability' },
      });

      await expect(
        create(
          { ...minimalRequest, template: { id: 'tmpl-exp' } },
          clientArgs,
          expansionCasesClientMock
        )
      ).rejects.toThrow('Template tmpl-exp not found');
    });

    it('rejects a disabled template with the same not-found error', async () => {
      const clientArgs = createClientArgs();
      clientArgs.services.templatesService.getTemplate.mockResolvedValue({
        ...templateSO,
        attributes: { ...templateSO.attributes, isEnabled: false },
      });

      await expect(
        create(
          { ...minimalRequest, template: { id: 'tmpl-exp' } },
          clientArgs,
          expansionCasesClientMock
        )
      ).rejects.toThrow('Template tmpl-exp not found');
    });

    it('does not expand when the templates flag is disabled and rejects an unpinned version', async () => {
      const clientArgs = createClientArgs({ templatesEnabled: false });

      await expect(
        create(
          { ...minimalRequest, template: { id: 'tmpl-exp' } },
          clientArgs,
          expansionCasesClientMock
        )
      ).rejects.toThrow('template.version is required');
      expect(clientArgs.services.templatesService.getTemplate).not.toHaveBeenCalled();
    });

    it('stores a pinned template verbatim without expansion when the flag is disabled', async () => {
      const clientArgs = createClientArgs({ templatesEnabled: false });

      await create(
        { ...minimalRequest, template: { id: 'tmpl-exp', version: 2 } },
        clientArgs,
        expansionCasesClientMock
      );

      const [[createArgs]] = clientArgs.services.caseService.createCase.mock.calls;
      expect(createArgs.attributes.template).toEqual({ id: 'tmpl-exp', version: 2 });
      // No expansion: template defaults must not appear.
      expect(createArgs.attributes.extended_fields).toBeUndefined();
      expect(createArgs.attributes.category).toBeNull();
      // Flag-off creation must stay byte-for-byte as before this PR: a caller-pinned template is
      // stored verbatim but the template/extended_fields user actions are NOT emitted (that path
      // is gated on the templates flag).
      expect(
        clientArgs.services.userActionService.creator.bulkCreateUserAction
      ).not.toHaveBeenCalled();
    });

    it('validates the merged extended_fields (template fetched once)', async () => {
      const clientArgs = createClientArgs();

      await expect(
        create(
          {
            ...minimalRequest,
            template: { id: 'tmpl-exp' },
            extended_fields: { unknown_key_as_keyword: 'x' },
          },
          clientArgs,
          expansionCasesClientMock
        )
      ).rejects.toThrow('Unknown extended field key: "unknown_key_as_keyword"');
      expect(clientArgs.services.caseService.createCase).not.toHaveBeenCalled();
      // Expansion resolved the template; validation reused it instead of fetching again.
      expect(clientArgs.services.templatesService.getTemplate).toHaveBeenCalledTimes(1);
    });
  });
});

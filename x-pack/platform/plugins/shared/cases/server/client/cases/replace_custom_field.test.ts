/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import { MAX_USER_ACTIONS_PER_CASE } from '../../../common/constants';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { replaceCustomField } from './replace_custom_field';

describe('Replace custom field', () => {
  const customFields = [
    {
      key: 'first_key',
      type: CustomFieldTypes.TEXT as const,
      value: 'this is a text field value',
    },
    {
      key: 'second_key',
      type: CustomFieldTypes.TOGGLE as const,
      value: null,
    },
  ];

  const theCase = { ...mockCases[0], attributes: { ...mockCases[0].attributes, customFields } };
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
    clientArgs.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [mockCases[0].id]: 1,
    });

    casesClient.configure.get = jest.fn().mockResolvedValue([
      {
        owner: mockCases[0].attributes.owner,
        customFields: [
          {
            key: 'first_key',
            type: CustomFieldTypes.TEXT,
            label: 'missing field 1',
            required: true,
          },
          {
            key: 'second_key',
            type: CustomFieldTypes.TOGGLE,
            label: 'foo',
            required: false,
          },
        ],
      },
    ]);
  });

  it('can replace text customField', async () => {
    clientArgs.services.caseService.patchCase.mockResolvedValue({
      ...theCase,
    });

    await expect(
      replaceCustomField(
        {
          caseId: theCase.id,
          customFieldId: 'first_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: 'Updated text field value',
          },
        },
        clientArgs,
        casesClient
      )
    ).resolves.not.toThrow();

    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: theCase.id,
        version: theCase.version,
        originalCase: {
          ...theCase,
        },
        updatedAttributes: {
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'Updated text field value',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: null,
            },
          ],
          updated_at: expect.any(String),
          updated_by: expect.any(Object),
        },
        refresh: false,
      })
    );
  });

  it('can replace toggle customField', async () => {
    clientArgs.services.caseService.patchCase.mockResolvedValue({
      ...theCase,
    });

    await expect(
      replaceCustomField(
        {
          caseId: theCase.id,
          customFieldId: 'second_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: true,
          },
        },
        clientArgs,
        casesClient
      )
    ).resolves.not.toThrow();

    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: theCase.id,
        version: theCase.version,
        originalCase: {
          ...theCase,
        },
        updatedAttributes: {
          customFields: [
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: true,
            },
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'this is a text field value',
            },
          ],
          updated_at: expect.any(String),
          updated_by: expect.any(Object),
        },
        refresh: false,
      })
    );
  });

  it('does not throw error when customField value is null and the custom field is not required', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'second_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: null,
          },
        },
        clientArgs,
        casesClient
      )
    ).resolves.not.toThrow();
  });

  it('throws error when request is invalid', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            // @ts-expect-error check for invalid attribute
            foo: 'bar',
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: first_key of case: mock-id-1 version:WzAsMV0= : Error: Invalid value \\"undefined\\" supplied to \\"value\\""`
    );
  });

  it('throws error when case version does not match', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: {
            caseVersion: 'random-version',
            value: 'test',
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: first_key of case: mock-id-1 version:random-version : Error: This case mock-id-1 has been updated. Please refresh before saving additional updates."`
    );
  });

  it('throws error when customField value is null and the custom field is required', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: null,
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: first_key of case: mock-id-1 version:WzAsMV0= : Error: Custom field value cannot be null or undefined."`
    );
  });

  it('throws error when required customField of type text has value as empty string', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: '            ',
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: first_key of case: mock-id-1 version:WzAsMV0= : Error: Invalid value \\"            \\" supplied to \\"value\\",The value field cannot be an empty string."`
    );
  });

  it('throws error when customField value is undefined and the custom field is required', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            // @ts-expect-error: undefined value
            value: undefined,
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: first_key of case: mock-id-1 version:WzAsMV0= : Error: Invalid value \\"undefined\\" supplied to \\"value\\""`
    );
  });

  it('throws error when customField key is not present in configuration', async () => {
    clientArgs.services.caseService.getCase.mockResolvedValue(mockCases[0]);

    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'missing_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: 'updated',
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: missing_key of case: mock-id-1 version:WzAsMV0= : Error: cannot find custom field"`
    );
  });

  it('throws error when the customField type does not match the configuration', async () => {
    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'second_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: 'foobar',
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: second_key of case: mock-id-1 version:WzAsMV0= : Error: Invalid value \\"foobar\\" supplied to \\"value\\""`
    );
  });

  it('throws error when the customField not found after update', async () => {
    clientArgs.services.caseService.patchCase.mockResolvedValue({
      ...theCase,
      attributes: {
        ...theCase.attributes,
        customFields: [],
      },
    });

    await expect(
      replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'second_key',
          request: {
            caseVersion: mockCases[0].version ?? '',
            value: false,
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to replace customField, id: second_key of case: mock-id-1 version:WzAsMV0= : Error: Cannot find updated custom field."`
    );
  });

  describe('Validate max user actions', () => {
    it('passes validation if max user actions per case is not reached', async () => {
      clientArgs.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
        [mockCases[0].id]: MAX_USER_ACTIONS_PER_CASE - 1,
      });

      // @ts-ignore: only the array length matters here
      clientArgs.services.userActionService.creator.buildUserActions.mockReturnValue({
        [mockCases[0].id]: [1],
      });

      clientArgs.services.caseService.patchCase.mockResolvedValue(theCase);

      await expect(
        replaceCustomField(
          {
            caseId: mockCases[0].id,
            customFieldId: 'first_key',
            request: {
              caseVersion: mockCases[0].version ?? '',
              value: 'foobar',
            },
          },
          clientArgs,
          casesClient
        )
      ).resolves.not.toThrow();
    });

    it(`throws an error when the user actions to be created will reach ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
      clientArgs.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
        [mockCases[0].id]: MAX_USER_ACTIONS_PER_CASE,
      });

      // @ts-ignore: only the array length matters here
      clientArgs.services.userActionService.creator.buildUserActions.mockReturnValue({
        [mockCases[0].id]: [1, 2, 3],
      });

      await expect(
        replaceCustomField(
          {
            caseId: mockCases[0].id,
            customFieldId: 'first_key',
            request: {
              caseVersion: mockCases[0].version ?? '',
              value: 'foobar',
            },
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        `Failed to replace customField, id: first_key of case: mock-id-1 version:WzAsMV0= : Error: The case with id mock-id-1 has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
      );
    });
  });

  describe('customFields → extended_fields adapter (write-time mirror)', () => {
    it('mirrors the replaced customField into extended_fields when templates flag is enabled', async () => {
      const clientArgsWithFlag = createCasesClientMockArgs();
      clientArgsWithFlag.config = { ...clientArgsWithFlag.config, templates: { enabled: true } };
      clientArgsWithFlag.services.caseService.getCase.mockResolvedValue(theCase);
      clientArgsWithFlag.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
        { [mockCases[0].id]: 1 }
      );
      clientArgsWithFlag.services.caseService.patchCase.mockResolvedValue({ ...theCase });

      const casesClientLocal = createCasesClientMock();
      casesClientLocal.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            { key: 'first_key', type: CustomFieldTypes.TEXT, label: 'First', required: true },
            { key: 'second_key', type: CustomFieldTypes.TOGGLE, label: 'Second', required: false },
          ],
        },
      ]);

      await replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: { caseVersion: mockCases[0].version ?? '', value: 'new_value' },
        },
        clientArgsWithFlag,
        casesClientLocal
      );

      const [[patchArgs]] = clientArgsWithFlag.services.caseService.patchCase.mock.calls;
      expect(patchArgs.updatedAttributes.extended_fields).toMatchObject({
        first_key_as_keyword: 'new_value',
      });
    });

    it('does not mirror into extended_fields when templates flag is disabled', async () => {
      // FAILURE SCENARIO: adapter runs unconditionally — extended_fields is written when flag is off.
      const clientArgsNoFlag = createCasesClientMockArgs();
      // config.templates.enabled defaults to false
      clientArgsNoFlag.services.caseService.getCase.mockResolvedValue(theCase);
      clientArgsNoFlag.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
        { [mockCases[0].id]: 1 }
      );
      clientArgsNoFlag.services.caseService.patchCase.mockResolvedValue({ ...theCase });

      const casesClientLocal = createCasesClientMock();
      casesClientLocal.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            { key: 'first_key', type: CustomFieldTypes.TEXT, label: 'First', required: true },
            { key: 'second_key', type: CustomFieldTypes.TOGGLE, label: 'Second', required: false },
          ],
        },
      ]);

      await replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: { caseVersion: mockCases[0].version ?? '', value: 'new_value' },
        },
        clientArgsNoFlag,
        casesClientLocal
      );

      const [[patchArgs]] = clientArgsNoFlag.services.caseService.patchCase.mock.calls;
      expect(patchArgs.updatedAttributes.extended_fields).toBeUndefined();
    });

    it('overrides an existing extended_fields entry when the value changes (customFields-win)', async () => {
      const caseWithExtendedFields = {
        ...theCase,
        attributes: {
          ...theCase.attributes,
          extended_fields: { first_key_as_keyword: 'original' },
        },
      };

      const clientArgsWithFlag = createCasesClientMockArgs();
      clientArgsWithFlag.config = { ...clientArgsWithFlag.config, templates: { enabled: true } };
      clientArgsWithFlag.services.caseService.getCase.mockResolvedValue(caseWithExtendedFields);
      clientArgsWithFlag.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
        { [mockCases[0].id]: 1 }
      );
      clientArgsWithFlag.services.caseService.patchCase.mockResolvedValue({
        ...caseWithExtendedFields,
      });

      const casesClientLocal = createCasesClientMock();
      casesClientLocal.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            { key: 'first_key', type: CustomFieldTypes.TEXT, label: 'First', required: true },
            { key: 'second_key', type: CustomFieldTypes.TOGGLE, label: 'Second', required: false },
          ],
        },
      ]);

      await replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: { caseVersion: mockCases[0].version ?? '', value: 'updated_value' },
        },
        clientArgsWithFlag,
        casesClientLocal
      );

      const [[patchArgs]] = clientArgsWithFlag.services.caseService.patchCase.mock.calls;
      // CustomFields-win: the incoming value overrides the stale mirror.
      expect(patchArgs.updatedAttributes.extended_fields).toEqual({
        first_key_as_keyword: 'updated_value',
      });
    });

    it('is a no-op (extended_fields omitted) when the replaced value equals the existing mirror', async () => {
      const caseWithExtendedFields = {
        ...theCase,
        attributes: {
          ...theCase.attributes,
          extended_fields: { first_key_as_keyword: 'same_value' },
        },
      };

      const clientArgsWithFlag = createCasesClientMockArgs();
      clientArgsWithFlag.config = { ...clientArgsWithFlag.config, templates: { enabled: true } };
      clientArgsWithFlag.services.caseService.getCase.mockResolvedValue(caseWithExtendedFields);
      clientArgsWithFlag.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
        { [mockCases[0].id]: 1 }
      );
      clientArgsWithFlag.services.caseService.patchCase.mockResolvedValue({
        ...caseWithExtendedFields,
      });

      const casesClientLocal = createCasesClientMock();
      casesClientLocal.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            { key: 'first_key', type: CustomFieldTypes.TEXT, label: 'First', required: true },
          ],
        },
      ]);

      await replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: { caseVersion: mockCases[0].version ?? '', value: 'same_value' },
        },
        clientArgsWithFlag,
        casesClientLocal
      );

      const [[patchArgs]] = clientArgsWithFlag.services.caseService.patchCase.mock.calls;
      // Value is identical — no spurious write.
      expect(patchArgs.updatedAttributes.extended_fields).toBeUndefined();
    });

    it('does not wipe unrelated mirror keys for stored-null optional fields (regression: stored-null delete)', async () => {
      // theCase has second_key: { value: null }. A v2 UI write may have set second_key_as_boolean
      // in extended_fields. Replacing only first_key must not delete second_key_as_boolean.
      const caseWithExtendedFields = {
        ...theCase,
        attributes: {
          ...theCase.attributes,
          extended_fields: { second_key_as_boolean: 'true' },
        },
      };

      const clientArgsWithFlag = createCasesClientMockArgs();
      clientArgsWithFlag.config = { ...clientArgsWithFlag.config, templates: { enabled: true } };
      clientArgsWithFlag.services.caseService.getCase.mockResolvedValue(caseWithExtendedFields);
      clientArgsWithFlag.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
        { [mockCases[0].id]: 1 }
      );
      clientArgsWithFlag.services.caseService.patchCase.mockResolvedValue({
        ...caseWithExtendedFields,
      });

      const casesClientLocal = createCasesClientMock();
      casesClientLocal.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            { key: 'first_key', type: CustomFieldTypes.TEXT, label: 'First', required: true },
            { key: 'second_key', type: CustomFieldTypes.TOGGLE, label: 'Second', required: false },
          ],
        },
      ]);

      await replaceCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          request: { caseVersion: mockCases[0].version ?? '', value: 'new_value' },
        },
        clientArgsWithFlag,
        casesClientLocal
      );

      const [[patchArgs]] = clientArgsWithFlag.services.caseService.patchCase.mock.calls;
      // first_key mirror is set; second_key_as_boolean must be preserved (not wiped by stored null).
      expect(patchArgs.updatedAttributes.extended_fields).toEqual({
        first_key_as_keyword: 'new_value',
        second_key_as_boolean: 'true',
      });
    });
  });
});

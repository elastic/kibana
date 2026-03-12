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
});

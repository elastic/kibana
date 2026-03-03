/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';

import {
  MAX_ASSIGNEES_FILTER_LENGTH,
  MAX_CASES_PER_PAGE,
  MAX_CATEGORY_FILTER_LENGTH,
  MAX_DOCS_PER_PAGE,
  MAX_REPORTERS_FILTER_LENGTH,
  MAX_TAGS_FILTER_LENGTH,
} from '../../../common/constants';
import { flattenCaseSavedObject } from '../../common/utils';
import { mockCases } from '../../mocks';
import {
  createCasesClientMock,
  createCasesClientMockArgs,
  createCasesClientMockSearchRequest,
} from '../mocks';
import { search } from './search';

jest.mock('@kbn/spaces-plugin/server/lib/utils/namespace', () => ({
  spaceIdToNamespace: jest.fn().mockReturnValue('space1'),
}));

describe('search', () => {
  const configureMock = [
    {
      customFields: [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'Text field',
          required: true,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'Toggle field',
          required: true,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'another toggle field',
          required: false,
        },
      ],
    },
  ];
  const casesClientMock = createCasesClientMock();
  casesClientMock.configure.get = jest.fn().mockResolvedValue(configureMock);

  describe('search', () => {
    const clientArgs = createCasesClientMockArgs();
    const casesMap = new Map<string, Case>(
      mockCases.map((obj) => {
        return [obj.id, flattenCaseSavedObject({ savedObject: obj, totalComment: 2 })];
      })
    );
    clientArgs.services.caseService.searchCasesGroupedByID.mockResolvedValue({
      page: 1,
      perPage: 10,
      total: casesMap.size,
      casesMap,
    });
    clientArgs.services.caseService.getCaseStatusStats.mockResolvedValue({
      open: 1,
      'in-progress': 2,
      closed: 3,
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('calls searchCasesGroupedByID with correct parameters', async () => {
      const searchTerm = 'foobar';
      const searchRequest = createCasesClientMockSearchRequest({ search: searchTerm });
      await search(searchRequest, clientArgs, casesClientMock);
      await expect(clientArgs.services.caseService.searchCasesGroupedByID).toHaveBeenCalled();

      const call = clientArgs.services.caseService.searchCasesGroupedByID.mock.calls[0][0];

      expect(call.caseOptions.search).toBe(searchTerm);
      expect(call.namespaces).toEqual(['space1']);
    });

    it('search with single custom field', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true] },
        owner: 'cases',
      });
      await search(searchRequest, clientArgs, casesClientMock);
      await expect(clientArgs.services.caseService.searchCasesGroupedByID).toHaveBeenCalled();
    });

    it('search with single custom field with multiple values', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true, null] },
        owner: ['cases'],
      });
      await search(searchRequest, clientArgs, casesClientMock);
      await expect(clientArgs.services.caseService.searchCasesGroupedByID).toHaveBeenCalled();
    });

    it('search with multiple custom fields', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true], third_key: [true] },
        owner: ['cases'],
      });
      await search(searchRequest, clientArgs, casesClientMock);
      await expect(clientArgs.services.caseService.searchCasesGroupedByID).toHaveBeenCalled();
    });

    it('search with null custom fields', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [null] },
        owner: 'cases',
      });
      await search(searchRequest, clientArgs, casesClientMock);
      await expect(clientArgs.services.caseService.searchCasesGroupedByID).toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    const clientArgs = createCasesClientMockArgs();
    const casesMap = new Map<string, Case>(
      mockCases.map((obj) => {
        return [obj.id, flattenCaseSavedObject({ savedObject: obj, totalComment: 2 })];
      })
    );
    clientArgs.services.caseService.searchCasesGroupedByID.mockResolvedValue({
      page: 1,
      perPage: 10,
      total: casesMap.size,
      casesMap,
    });
    clientArgs.services.caseService.getCaseStatusStats.mockResolvedValue({
      open: 1,
      'in-progress': 2,
      closed: 3,
    });
    casesClientMock.configure.get = jest.fn().mockResolvedValue(configureMock);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('when foo:bar attribute in request payload', async () => {
      const searchTerm = 'sample_text';
      const searchRequest = createCasesClientMockSearchRequest({ search: searchTerm });
      await expect(
        // @ts-expect-error foo is an invalid field
        search({ ...searchRequest, foo: 'bar' }, clientArgs, casesClientMock)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find cases: {\\"search\\":\\"sample_text\\",\\"searchFields\\":[\\"cases.title\\",\\"cases.description\\",\\"cases.incremental_id.text\\",\\"cases-comments.comment\\"],\\"severity\\":\\"low\\",\\"assignees\\":[],\\"reporters\\":[],\\"status\\":\\"open\\",\\"tags\\":[],\\"owner\\":[],\\"sortField\\":\\"createdAt\\",\\"sortOrder\\":\\"desc\\",\\"customFields\\":{},\\"foo\\":\\"bar\\"}: Error: invalid keys \\"foo\\""`
      );
    });

    it('invalid searchFields with array', async () => {
      const searchFields = ['foobar'];

      // @ts-expect-error
      const searchRequest = createCasesClientMockSearchRequest({ searchFields });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrow(
        'Error: Invalid value "foobar" supplied to "searchFields"'
      );
    });

    it('invalid searchFields with single string', async () => {
      const searchFields = 'foobar';

      // @ts-expect-error
      const searchRequest = createCasesClientMockSearchRequest({ searchFields });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrow(
        'Error: Invalid value "foobar" supplied to "searchFields"'
      );
    });

    it('invalid sortField', async () => {
      const sortField = 'foobar';

      // @ts-expect-error
      const searchRequest = createCasesClientMockSearchRequest({ sortField });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrow(
        'Error: Invalid value "foobar" supplied to "sortField"'
      );
    });

    it(`throws an error when the category array has ${MAX_CATEGORY_FILTER_LENGTH} items`, async () => {
      const category = Array(MAX_CATEGORY_FILTER_LENGTH + 1).fill('foobar');

      const searchRequest = createCasesClientMockSearchRequest({ category });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrow(
        `Error: The length of the field category is too long. Array must be of length <= ${MAX_CATEGORY_FILTER_LENGTH}`
      );
    });

    it(`throws an error when the tags array has ${MAX_TAGS_FILTER_LENGTH} items`, async () => {
      const tags = Array(MAX_TAGS_FILTER_LENGTH + 1).fill('foobar');

      const searchRequest = createCasesClientMockSearchRequest({ tags });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        `Error: The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_FILTER_LENGTH}`
      );
    });

    it(`throws an error when the assignees array has ${MAX_ASSIGNEES_FILTER_LENGTH} items`, async () => {
      const assignees = Array(MAX_ASSIGNEES_FILTER_LENGTH + 1).fill('foobar');

      const searchRequest = createCasesClientMockSearchRequest({ assignees });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        `Error: The length of the field assignees is too long. Array must be of length <= ${MAX_ASSIGNEES_FILTER_LENGTH}`
      );
    });

    it(`throws an error when the reporters array has ${MAX_REPORTERS_FILTER_LENGTH} items`, async () => {
      const reporters = Array(MAX_REPORTERS_FILTER_LENGTH + 1).fill('foobar');

      const searchRequest = createCasesClientMockSearchRequest({ reporters });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        `Error: The length of the field reporters is too long. Array must be of length <= ${MAX_REPORTERS_FILTER_LENGTH}.`
      );
    });

    it('Invalid total items results in error', async () => {
      const searchRequest = createCasesClientMockSearchRequest({ page: 209, perPage: 100 });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        `Error: The number of documents is too high. Paginating through more than ${MAX_DOCS_PER_PAGE} documents is not possible.`
      );
    });

    it('Invalid perPage items results in error', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        page: 1,
        perPage: MAX_CASES_PER_PAGE + 1,
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        `Error: The provided perPage value is too high. The maximum allowed perPage value is ${MAX_CASES_PER_PAGE}.`
      );
    });

    it('throws error when search with customFields and no owner', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true] },
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: Owner must be provided. Multiple owners are not supported.`
      );
    });

    it('throws error when search with customFields and owner as empty string array', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true] },
        owner: [''],
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: Owner must be provided. Multiple owners are not supported.`
      );
    });

    it('throws error when search with customFields and multiple owners', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true] },
        owner: ['cases', 'observability'],
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: Owner must be provided. Multiple owners are not supported.`
      );
    });

    it('throws error when no customField is not same as configuration', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { test_custom_field_key: [true] },
        owner: 'cases',
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: Invalid custom field key: test_custom_field_key.`
      );
    });

    it('throws error when search with non filterable custom field', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { first_key: ['hello'] },
        owner: 'cases',
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: Filtering by custom field of type text is not allowed.`
      );
    });

    it('throws error when search with invalid value', async () => {
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: ['hello'] },
        owner: 'cases',
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: Unsupported filtering value for custom field of type toggle.`
      );
    });

    it('throws error when no customFields in configuration', async () => {
      casesClientMock.configure.get = jest.fn().mockResolvedValue([]);
      const searchRequest = createCasesClientMockSearchRequest({
        customFields: { second_key: [true] },
        owner: 'cases',
      });

      await expect(search(searchRequest, clientArgs, casesClientMock)).rejects.toThrowError(
        ` Error: No custom fields configured.`
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import {
  INTERNAL_BULK_DELETE_TEMPLATES_URL,
  INTERNAL_BULK_EXPORT_TEMPLATES_URL,
  INTERNAL_TEMPLATE_CREATORS_URL,
  INTERNAL_TEMPLATE_TAGS_URL,
  INTERNAL_TEMPLATES_URL,
} from '../../../../common/constants';

jest.mock('../../../common/lib/kibana', () => {
  return {
    KibanaServices: {
      get: jest.fn(),
    },
  };
});

jest.mock('../utils/templates_to_yaml', () => {
  return {
    templatesToYaml: jest.fn(),
    templateToYaml: jest.fn(),
  };
});

import { KibanaServices } from '../../../common/lib/kibana';
import { templatesToYaml } from '../utils/templates_to_yaml';
import {
  getTemplates,
  bulkDeleteTemplates,
  bulkExportTemplates,
  getTemplateTags,
  getTemplateCreators,
} from './api';

const kibanaServicesMock = KibanaServices as jest.Mocked<typeof KibanaServices>;
const templatesToYamlMock = templatesToYaml as jest.MockedFunction<typeof templatesToYaml>;

describe('templates_v2 api bulk actions', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    kibanaServicesMock.get.mockReturnValue({
      http: {
        fetch: fetchMock,
      },
    } as unknown as ReturnType<typeof KibanaServices.get>);
  });

  describe('getTemplates', () => {
    it('calls the templates endpoint with query params', async () => {
      const signal = new AbortController().signal;
      const mockResponse = {
        templates: [],
        page: 1,
        perPage: 10,
        total: 0,
      };
      fetchMock.mockResolvedValue(mockResponse);

      const queryParams = {
        page: 1,
        perPage: 10,
        search: 'test',
        sortField: 'name' as const,
        sortOrder: 'asc' as const,
        tags: ['security'],
        author: ['alice'],
        isDeleted: false,
      };

      const res = await getTemplates({ signal, queryParams });

      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_TEMPLATES_URL, {
        method: 'GET',
        query: {
          page: 1,
          perPage: 10,
          search: 'test',
          sortField: 'name',
          sortOrder: 'asc',
          tags: ['security'],
          author: ['alice'],
          isDeleted: false,
        },
        signal,
      });

      expect(res).toEqual(mockResponse);
    });

    it('passes default query params correctly', async () => {
      const mockResponse = {
        templates: [],
        page: 1,
        perPage: 10,
        total: 0,
      };
      fetchMock.mockResolvedValue(mockResponse);

      const queryParams = {
        page: 1,
        perPage: 10,
        search: '',
        sortField: 'name' as const,
        sortOrder: 'asc' as const,
        tags: [] as string[],
        author: [] as string[],
        isDeleted: false,
      };

      const res = await getTemplates({ queryParams });

      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_TEMPLATES_URL, {
        method: 'GET',
        query: {
          page: 1,
          perPage: 10,
          search: '',
          sortField: 'name',
          sortOrder: 'asc',
          isDeleted: false,
        },
        signal: undefined,
      });

      expect(res).toEqual(mockResponse);
    });
  });

  describe('bulkDeleteTemplates', () => {
    it('calls internal bulk delete endpoint and returns success response', async () => {
      const signal = new AbortController().signal;
      fetchMock.mockResolvedValue(undefined);

      const res = await bulkDeleteTemplates({ templateIds: ['t-1', 't-2'], signal });

      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_BULK_DELETE_TEMPLATES_URL, {
        method: 'POST',
        body: JSON.stringify({ ids: ['t-1', 't-2'] }),
        signal,
      });

      expect(res).toEqual({
        success: true,
        deleted: ['t-1', 't-2'],
        errors: [],
      });
    });
  });

  // NOTE: single-template delete is implemented by calling bulkDeleteTemplates with a single id.

  describe('bulkExportTemplates', () => {
    let dateNowSpy: jest.SpyInstance<number, []> | undefined;
    let anchorClickSpy: jest.SpyInstance<void, []> | undefined;

    beforeEach(() => {
      // stable filename
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123);

      anchorClickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      dateNowSpy?.mockRestore();
      anchorClickSpy?.mockRestore();
    });

    it('calls internal bulk export endpoint, serializes yaml via util, and triggers download', async () => {
      const signal = new AbortController().signal;

      const templates: ParsedTemplate[] = [
        {
          templateId: 'template-1',
          name: 'My template',
          owner: 'securitySolution',
          definition: { name: 'My template', fields: [] },
          templateVersion: 1,
          deletedAt: null,
          isLatest: true,
          latestVersion: 1,
        },
      ];

      fetchMock.mockResolvedValue(templates);
      templatesToYamlMock.mockReturnValue('yaml-content');

      const res = await bulkExportTemplates({ templateIds: ['template-1'], signal });

      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_BULK_EXPORT_TEMPLATES_URL, {
        method: 'POST',
        body: JSON.stringify({ ids: ['template-1'] }),
        signal,
      });

      expect(templatesToYamlMock).toHaveBeenCalledWith(templates);

      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

      expect(res).toEqual({
        filename: 'templates-bulk-export-123.yaml',
        content: 'yaml-content',
      });
    });
  });

  describe('getTemplateTags', () => {
    it('calls template tags endpoint', async () => {
      const signal = new AbortController().signal;
      fetchMock.mockResolvedValue(['tag-a', 'tag-b']);

      const res = await getTemplateTags({ signal });

      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_TEMPLATE_TAGS_URL, {
        method: 'GET',
        signal,
      });
      expect(res).toEqual(['tag-a', 'tag-b']);
    });
  });

  describe('getTemplateCreators', () => {
    it('calls template creators endpoint', async () => {
      const signal = new AbortController().signal;
      fetchMock.mockResolvedValue(['alice', 'bob']);

      const res = await getTemplateCreators({ signal });

      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_TEMPLATE_CREATORS_URL, {
        method: 'GET',
        signal,
      });
      expect(res).toEqual(['alice', 'bob']);
    });
  });

  // NOTE: single-template export is implemented by calling bulkExportTemplates with a single id.
});

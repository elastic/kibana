/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';
import { RuleTemplatesApi } from './rule_templates_api';

describe('RuleTemplatesApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new (class extends RuleTemplatesApi {
    constructor() {
      super(http as any);
    }
  })();

  beforeEach(() => jest.clearAllMocks());

  describe('listRuleTemplates', () => {
    it('sends a GET request with list query params', async () => {
      http.get.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 });

      await api.listRuleTemplates({
        page: 2,
        per_page: 10,
        search: 'cpu',
        tags: ['prod'],
        excluded_tags: ['deprecated'],
        sort_field: 'name',
        sort_order: 'asc',
      });

      expect(http.get).toHaveBeenCalledWith(ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH, {
        query: {
          page: 2,
          per_page: 10,
          search: 'cpu',
          tags: ['prod'],
          excluded_tags: ['deprecated'],
          sort_field: 'name',
          sort_order: 'asc',
        },
      });
    });

    it('omits empty search and tags', async () => {
      http.get.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 });

      await api.listRuleTemplates({ search: '', tags: [], excluded_tags: [] });

      expect(http.get).toHaveBeenCalledWith(ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH, {
        query: {
          page: undefined,
          per_page: undefined,
          search: undefined,
          tags: undefined,
          excluded_tags: undefined,
          sort_field: undefined,
          sort_order: undefined,
        },
      });
    });
  });

  describe('listTags', () => {
    it('fetches tags using the search prefix', async () => {
      http.get.mockResolvedValue({ tags: ['production'] });

      await expect(api.listTags({ search: 'pro' })).resolves.toEqual({ tags: ['production'] });
      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/tags`, {
        query: { search: 'pro' },
      });
    });

    it.each([undefined, ''])('omits an absent or empty prefix: %p', async (search) => {
      await api.listTags(search === undefined ? undefined : { search });

      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/tags`, {
        query: { search: undefined },
      });
    });
  });

  describe('getRuleTemplate', () => {
    it('sends a GET request with the template id in the path', async () => {
      http.get.mockResolvedValue({ id: 'template-1' });

      await api.getRuleTemplate('template-1');

      expect(http.get).toHaveBeenCalledWith(
        `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/template-1`,
        { signal: undefined }
      );
    });
  });
});

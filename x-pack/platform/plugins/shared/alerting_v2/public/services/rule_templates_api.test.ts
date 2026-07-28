/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH } from '@kbn/alerting-v2-constants';
import { RuleTemplatesApi } from './rule_templates_api';

describe('RuleTemplatesApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new (class extends RuleTemplatesApi {
    constructor() {
      super(http as any);
    }
  })();

  beforeEach(() => jest.clearAllMocks());

  describe('findRuleTemplates', () => {
    it('sends a GET request with query params', async () => {
      http.get.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });

      await api.findRuleTemplates({
        page: 2,
        perPage: 10,
        search: 'cpu',
        tags: ['k8s'],
        sortField: 'name',
        sortOrder: 'asc',
      });

      expect(http.get).toHaveBeenCalledWith(ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH, {
        query: {
          page: 2,
          perPage: 10,
          search: 'cpu',
          sortField: 'name',
          sortOrder: 'asc',
          tags: ['k8s'],
        },
      });
    });

    it('omits empty tags and search', async () => {
      http.get.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });

      await api.findRuleTemplates({ tags: [], search: '' });

      expect(http.get).toHaveBeenCalledWith(ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH, {
        query: {
          page: undefined,
          perPage: undefined,
          search: undefined,
          sortField: undefined,
          sortOrder: undefined,
          tags: undefined,
        },
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { nodeBuilder } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { buildTemplateSearchQuery } from '../../../rules_client/common/filters';
import { searchRuleTemplatesSo } from './search_rule_templates_so';

describe('searchRuleTemplatesSo', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  const attributes = {
    name: 'Kubernetes idle data threshold',
    ruleTypeId: 'test.rule.type',
    schedule: { interval: '1m' },
    params: {},
    tags: ['k8s'],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    savedObjectsClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [
          {
            _id: `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}:template-1`,
            _source: {
              type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
              [RULE_TEMPLATE_SAVED_OBJECT_TYPE]: attributes,
              references: [],
            },
          },
        ],
      },
    });
  });

  it('maps raw hits back to saved objects and applies the v1 engine filter', async () => {
    const searchQuery = buildTemplateSearchQuery('idle data');
    expect(searchQuery).toBeDefined();
    if (!searchQuery) {
      return;
    }

    const result = await searchRuleTemplatesSo({
      savedObjectsClient,
      namespaces: ['default'],
      page: 1,
      perPage: 10,
      searchQuery,
    });

    expect(result).toEqual({
      page: 1,
      per_page: 10,
      total: 1,
      saved_objects: [
        {
          id: 'template-1',
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          attributes,
          references: [],
          score: 0,
        },
      ],
    });

    const query = savedObjectsClient.search.mock.calls[0][0].query;
    expect(JSON.stringify(query)).toContain('alerting_rule_template.engine');
    expect(JSON.stringify(query)).toContain('*idle data*');
  });

  it('rewrites authorization KQL onto ES field names', async () => {
    const searchQuery = buildTemplateSearchQuery('kub');
    expect(searchQuery).toBeDefined();
    if (!searchQuery) {
      return;
    }

    await searchRuleTemplatesSo({
      savedObjectsClient,
      namespaces: ['default'],
      searchQuery,
      filter: nodeBuilder.is(
        `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.ruleTypeId`,
        'test.rule.type'
      ),
    });

    const serialized = JSON.stringify(savedObjectsClient.search.mock.calls[0][0].query);
    expect(serialized).toContain('alerting_rule_template.ruleTypeId');
    expect(serialized).not.toContain('alerting_rule_template.attributes.ruleTypeId');
  });

  it('skips v2 template hits', async () => {
    savedObjectsClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [
          {
            _id: `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}:v2-template`,
            _source: {
              type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
              [RULE_TEMPLATE_SAVED_OBJECT_TYPE]: {
                engine: 'v2',
                rule: { metadata: { name: 'v2' } },
              },
            },
          },
        ],
      },
    });

    const searchQuery = buildTemplateSearchQuery('v2');
    expect(searchQuery).toBeDefined();
    if (!searchQuery) {
      return;
    }

    const result = await searchRuleTemplatesSo({
      savedObjectsClient,
      namespaces: ['default'],
      searchQuery,
    });

    expect(result.saved_objects).toEqual([]);
    expect(result.total).toBe(1);
  });
});

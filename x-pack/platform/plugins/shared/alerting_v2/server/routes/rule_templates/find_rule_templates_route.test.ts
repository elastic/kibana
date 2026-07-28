/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createRouteDependencies } from '../test_utils';
import { FindRuleTemplatesRoute } from './find_rule_templates_route';
import type { RuleTemplatesClient } from '../../lib/rule_templates_client';

describe('FindRuleTemplatesRoute', () => {
  it('returns rule templates from the client', async () => {
    const { ctx } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { page: 1, perPage: 10, search: 'cpu' },
    });
    const ruleTemplatesClient = {
      findRuleTemplates: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'template-1',
            kind: 'alert',
            engine: 'v2',
            metadata: {
              name: 'CPU high',
              tags: ['k8s'],
            },
            schedule: { every: '1m', lookback: '15m' },
            time_field: '@timestamp',
            query: {
              format: 'composed',
              base: 'FROM metrics-*',
              breach: { segment: 'WHERE cpu > 90' },
            },
          },
        ],
        total: 1,
        page: 1,
        perPage: 10,
      }),
    } as unknown as RuleTemplatesClient;

    const route = new FindRuleTemplatesRoute(ctx, request as any, ruleTemplatesClient);

    await route.handle();

    expect(ruleTemplatesClient.findRuleTemplates).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      search: 'cpu',
      sortField: undefined,
      sortOrder: undefined,
      tags: undefined,
    });
    expect(ctx.response.ok).toHaveBeenCalledWith({
      body: {
        items: [
          expect.objectContaining({
            id: 'template-1',
            engine: 'v2',
          }),
        ],
        total: 1,
        page: 1,
        perPage: 10,
      },
    });
  });

  it('returns customError when the client throws', async () => {
    const { ctx } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({ query: {} });
    const ruleTemplatesClient = {
      findRuleTemplates: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as RuleTemplatesClient;

    const route = new FindRuleTemplatesRoute(ctx, request as any, ruleTemplatesClient);

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
  });
});

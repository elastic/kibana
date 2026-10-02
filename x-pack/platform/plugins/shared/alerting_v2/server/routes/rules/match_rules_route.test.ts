/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MatchRulesBody } from '@kbn/alerting-v2-schemas';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RulesClient } from '../../lib/rules_client';
import { createRouteDependencies } from '../test_utils';
import { MatchRulesRoute, toFindMatchingRulesArgs } from './match_rules_route';
import { LIST_RULES_RESPONSE } from './list_rules_oas_example';

const createRulesClientStub = () =>
  ({
    findMatchingRules: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 }),
  }) as unknown as jest.Mocked<Pick<RulesClient, 'findMatchingRules'>>;

const buildRoute = (body: MatchRulesBody) => {
  const { ctx } = createRouteDependencies();
  const rulesClient = createRulesClientStub();
  const request = httpServerMock.createKibanaRequest({ body });
  const route = new MatchRulesRoute(ctx, request, rulesClient as unknown as RulesClient);

  return { ctx, rulesClient, route };
};

describe('toFindMatchingRulesArgs', () => {
  it('maps the snake_case body to camelCase client args', () => {
    expect(
      toFindMatchingRulesArgs({
        matcher: { tags: ['prod'], expression: 'severity: critical' },
        page: 2,
        per_page: 50,
      })
    ).toEqual({
      matcher: { tags: ['prod'], expression: 'severity: critical' },
      page: 2,
      perPage: 50,
    });
  });
});

describe('MatchRulesRoute', () => {
  it('forwards the matcher and pagination to the client', async () => {
    const { rulesClient, route } = buildRoute({
      matcher: { tags: ['prod', 'infra'] },
      page: 3,
      per_page: 10,
    });

    await route.handle();

    expect(rulesClient.findMatchingRules).toHaveBeenCalledWith({
      matcher: { tags: ['prod', 'infra'] },
      page: 3,
      perPage: 10,
    });
  });

  it('matches every rule when the body has no matcher', async () => {
    const { rulesClient, route } = buildRoute({});

    await route.handle();

    expect(rulesClient.findMatchingRules).toHaveBeenCalledWith({
      matcher: undefined,
      page: undefined,
      perPage: undefined,
    });
  });

  it('returns the client result in the response body', async () => {
    const { ctx, rulesClient, route } = buildRoute({ matcher: { tags: ['production'] } });
    rulesClient.findMatchingRules.mockResolvedValueOnce(LIST_RULES_RESPONSE);

    await route.handle();

    expect(ctx.response.ok).toHaveBeenCalledWith({ body: LIST_RULES_RESPONSE });
  });

  it('maps client errors onto the error response', async () => {
    const { ctx, rulesClient, route } = buildRoute({ matcher: { tags: ['production'] } });
    rulesClient.findMatchingRules.mockRejectedValueOnce(Boom.badRequest('Invalid filter.'));

    await route.handle();

    expect(ctx.response.ok).not.toHaveBeenCalled();
    expect(ctx.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });
});

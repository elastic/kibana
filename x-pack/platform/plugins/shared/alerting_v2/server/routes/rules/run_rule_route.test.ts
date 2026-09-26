/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RulesClient } from '../../lib/rules_client';
import { createRouteDependencies } from '../test_utils';
import { RunRuleRoute } from './run_rule_route';

const createRulesClientStub = () =>
  ({ runRuleNow: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<
    Pick<RulesClient, 'runRuleNow'>
  >);

describe('RunRuleRoute', () => {
  const request = httpServerMock.createKibanaRequest({ params: { id: 'rule-1' } });

  it('advertises 202 rather than 204, because the run is only scheduled', () => {
    expect(RunRuleRoute.schemas.response).toHaveProperty('202');
    expect(RunRuleRoute.schemas.response).not.toHaveProperty('204');
  });

  it('answers 202 once the rule is scheduled to run', async () => {
    const { ctx } = createRouteDependencies();
    const rulesClient = createRulesClientStub();

    const route = new RunRuleRoute(ctx, request, rulesClient as unknown as RulesClient);

    await route.handle();

    expect(rulesClient.runRuleNow).toHaveBeenCalledWith({ id: 'rule-1' });
    expect(ctx.response.accepted).toHaveBeenCalled();
    expect(ctx.response.noContent).not.toHaveBeenCalled();
  });

  it('maps a rejected scheduling attempt onto the error response', async () => {
    const { ctx } = createRouteDependencies();
    const rulesClient = createRulesClientStub();
    rulesClient.runRuleNow.mockRejectedValue(Boom.badRequest('Rule is disabled.'));

    const route = new RunRuleRoute(ctx, request, rulesClient as unknown as RulesClient);

    await route.handle();

    expect(ctx.response.accepted).not.toHaveBeenCalled();
    expect(ctx.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });
});

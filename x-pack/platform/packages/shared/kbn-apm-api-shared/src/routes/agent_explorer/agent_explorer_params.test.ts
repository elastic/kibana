/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { agentInstancesRoute } from './agent_instances';
import { agentsPerServiceRoute } from './agents_per_service';

const query = {
  environment: 'production',
  kuery: '',
  start: '2023-01-01T00:00:00.000Z',
  end: '2023-01-02T00:00:00.000Z',
  probability: '1',
};

describe('agentInstancesRoute params', () => {
  it('accepts path + query', () => {
    const result = agentInstancesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query,
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    const result = agentInstancesRoute.params!.safeParse({ path: {}, query });

    expectParseError(result);
  });
});

describe('agentsPerServiceRoute params', () => {
  it('accepts the required query without optional fields', () => {
    expectParseSuccess(agentsPerServiceRoute.params!.shape.query.safeParse(query));
  });

  it('accepts optional serviceName/agentLanguage', () => {
    const result = agentsPerServiceRoute.params!.shape.query.safeParse({
      ...query,
      serviceName: 'opbeans-java',
      agentLanguage: 'java',
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required field', () => {
    const { environment, ...withoutEnvironment } = query;

    expectParseError(agentsPerServiceRoute.params!.shape.query.safeParse(withoutEnvironment));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { infrastructureAttributesRoute } from './infrastructure_attributes';

describe('infrastructureAttributesRoute params', () => {
  it('accepts path + required query fields', () => {
    const result = infrastructureAttributesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-02T00:00:00.000Z',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional agentName', () => {
    const result = infrastructureAttributesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-02T00:00:00.000Z',
        environment: 'production',
        agentName: 'java',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required environment', () => {
    const result = infrastructureAttributesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

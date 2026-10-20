/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { downstreamDependenciesRouteRt } from './downstream_dependencies';

describe('downstreamDependenciesRouteRt', () => {
  it('parses required fields without the optional environment', () => {
    const result = downstreamDependenciesRouteRt.safeParse({
      serviceName: 'opbeans-java',
      start: 'now-15m',
      end: 'now',
    });

    expectParseSuccess(result);
    expect(result.data).toEqual({
      serviceName: 'opbeans-java',
      start: 'now-15m',
      end: 'now',
    });
  });

  it('parses the optional serviceEnvironment when provided', () => {
    const result = downstreamDependenciesRouteRt.safeParse({
      serviceName: 'opbeans-java',
      serviceEnvironment: 'production',
      start: 'now-15m',
      end: 'now',
    });

    expectParseSuccess(result);
    expect(result.data.serviceEnvironment).toEqual('production');
  });

  it('rejects a missing required field', () => {
    const result = downstreamDependenciesRouteRt.safeParse({
      start: 'now-15m',
      end: 'now',
    });

    expectParseError(result);
  });
});

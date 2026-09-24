/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { serviceMapRoute } from './service_map';
import { serviceMapDependencyNodeRoute } from './dependency_node';
import { serviceMapServiceBadgesRoute } from './service_badges';

describe('serviceMapRoute params', () => {
  it('accepts a query with no optional fields', () => {
    const result = serviceMapRoute.params!.safeParse({
      query: { environment: 'production', start: '2021-01-01', end: '2021-01-02' },
    });

    expectParseSuccess(result);
  });

  it('accepts a query with esQuery, kuery, serviceName and serviceGroup', () => {
    const result = serviceMapRoute.params!.safeParse({
      query: {
        environment: 'production',
        start: '2021-01-01',
        end: '2021-01-02',
        serviceName: 'opbeans-java',
        serviceGroup: 'my-group',
        kuery: 'service.name: "opbeans-java"',
        esQuery: JSON.stringify({ bool: { filter: [] } }),
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.esQuery).toEqual({ bool: { filter: [] } });
    }
  });

  it('rejects an invalid esQuery', () => {
    expectParseError(
      serviceMapRoute.params!.safeParse({
        query: {
          environment: 'production',
          start: '2021-01-01',
          end: '2021-01-02',
          esQuery: 'not-json',
        },
      })
    );
  });

  it('rejects a missing environment', () => {
    expectParseError(
      serviceMapRoute.params!.safeParse({
        query: { start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

describe('serviceMapDependencyNodeRoute params', () => {
  it('accepts a single dependency', () => {
    const result = serviceMapDependencyNodeRoute.params!.safeParse({
      query: {
        dependencies: 'postgresql',
        environment: 'production',
        start: '2021-01-01',
        end: '2021-01-02',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an array of dependencies plus optional sourceServiceName/offset', () => {
    const result = serviceMapDependencyNodeRoute.params!.safeParse({
      query: {
        dependencies: ['postgresql', 'redis'],
        sourceServiceName: 'opbeans-java',
        offset: '1d',
        environment: 'production',
        start: '2021-01-01',
        end: '2021-01-02',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing dependencies field', () => {
    expectParseError(
      serviceMapDependencyNodeRoute.params!.safeParse({
        query: { environment: 'production', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

describe('serviceMapServiceBadgesRoute params', () => {
  it('accepts a query/body with serviceNames as a JSON array', () => {
    const result = serviceMapServiceBadgesRoute.params!.safeParse({
      query: { environment: 'production', start: '2021-01-01', end: '2021-01-02' },
      body: { serviceNames: JSON.stringify(['opbeans-java', 'opbeans-node']) },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.body.serviceNames).toEqual(['opbeans-java', 'opbeans-node']);
    }
  });

  it('accepts an optional kuery', () => {
    const result = serviceMapServiceBadgesRoute.params!.safeParse({
      query: {
        environment: 'production',
        start: '2021-01-01',
        end: '2021-01-02',
        kuery: 'service.name: "opbeans-java"',
      },
      body: { serviceNames: JSON.stringify(['opbeans-java']) },
    });

    expectParseSuccess(result);
  });

  it('rejects a non-JSON serviceNames body', () => {
    expectParseError(
      serviceMapServiceBadgesRoute.params!.safeParse({
        query: { environment: 'production', start: '2021-01-01', end: '2021-01-02' },
        body: { serviceNames: 'not-json' },
      })
    );
  });

  it('rejects a missing body', () => {
    expectParseError(
      serviceMapServiceBadgesRoute.params!.safeParse({
        query: { environment: 'production', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

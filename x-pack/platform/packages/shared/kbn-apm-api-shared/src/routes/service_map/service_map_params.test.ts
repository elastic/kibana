/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { MAX_CONNECTION_RESOURCES } from './connection_params';
import { serviceMapRoute } from './service_map';
import { serviceMapDependencyNodeRoute } from './dependency_node';
import { serviceMapServiceBadgesRoute } from './service_badges';
import { serviceMapConnectionFailedCallsRoute } from './connection_failed_calls';
import { serviceMapConnectionTransactionsRoute } from './connection_transactions';

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

  it.each(['avg', 'p95', 'p99'])(
    'accepts the %s latency aggregation type',
    (latencyAggregationType) => {
      expectParseSuccess(
        serviceMapDependencyNodeRoute.params!.safeParse({
          query: {
            dependencies: 'postgresql',
            latencyAggregationType,
            environment: 'production',
            start: '2021-01-01',
            end: '2021-01-02',
          },
        })
      );
    }
  );

  it('rejects an unknown latency aggregation type', () => {
    expectParseError(
      serviceMapDependencyNodeRoute.params!.safeParse({
        query: {
          dependencies: 'postgresql',
          latencyAggregationType: 'p50',
          environment: 'production',
          start: '2021-01-01',
          end: '2021-01-02',
        },
      })
    );
  });
});

const connectionQuery = {
  sourceServiceName: 'opbeans-java',
  environment: 'production',
  start: '2021-01-01',
  end: '2021-01-02',
};

describe('serviceMapConnectionTransactionsRoute params', () => {
  it('turns a single dependency into an array', () => {
    const result = serviceMapConnectionTransactionsRoute.params!.safeParse({
      query: { ...connectionQuery, dependencies: 'redis' },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.dependencies).toEqual(['redis']);
    }
  });

  it('keeps an array of dependencies', () => {
    const result = serviceMapConnectionTransactionsRoute.params!.safeParse({
      query: { ...connectionQuery, dependencies: ['redis', 'postgresql'] },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.dependencies).toEqual(['redis', 'postgresql']);
    }
  });

  it('accepts a target service without dependencies and defaults them to an empty list', () => {
    const result = serviceMapConnectionTransactionsRoute.params!.safeParse({
      query: { ...connectionQuery, targetServiceName: 'opbeans-node' },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.dependencies).toEqual([]);
    }
  });

  it('rejects a query with neither dependencies nor a target service', () => {
    expectParseError(
      serviceMapConnectionTransactionsRoute.params!.safeParse({ query: connectionQuery })
    );
  });

  it('rejects a missing sourceServiceName', () => {
    expectParseError(
      serviceMapConnectionTransactionsRoute.params!.safeParse({
        query: {
          environment: 'production',
          start: '2021-01-01',
          end: '2021-01-02',
          dependencies: 'redis',
        },
      })
    );
  });
});

describe('serviceMapConnectionFailedCallsRoute params', () => {
  it('turns a single dependency into an array', () => {
    const result = serviceMapConnectionFailedCallsRoute.params!.safeParse({
      query: { ...connectionQuery, dependencies: 'redis' },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.dependencies).toEqual(['redis']);
    }
  });

  it('accepts dependencies with a target service', () => {
    expectParseSuccess(
      serviceMapConnectionFailedCallsRoute.params!.safeParse({
        query: {
          ...connectionQuery,
          dependencies: ['opbeans-node'],
          targetServiceName: 'opbeans-node',
        },
      })
    );
  });

  it('rejects a missing dependencies field', () => {
    expectParseError(
      serviceMapConnectionFailedCallsRoute.params!.safeParse({
        query: { ...connectionQuery, targetServiceName: 'opbeans-node' },
      })
    );
  });

  it('rejects an empty list of dependencies', () => {
    expectParseError(
      serviceMapConnectionFailedCallsRoute.params!.safeParse({
        query: { ...connectionQuery, dependencies: [] },
      })
    );
  });

  it('accepts as many dependencies as a connection can have', () => {
    expectParseSuccess(
      serviceMapConnectionFailedCallsRoute.params!.safeParse({
        query: {
          ...connectionQuery,
          dependencies: Array.from({ length: MAX_CONNECTION_RESOURCES }, (_, i) => `api-${i}`),
        },
      })
    );
  });

  it('rejects more dependencies than a connection can have', () => {
    expectParseError(
      serviceMapConnectionFailedCallsRoute.params!.safeParse({
        query: {
          ...connectionQuery,
          dependencies: Array.from({ length: MAX_CONNECTION_RESOURCES + 1 }, (_, i) => `api-${i}`),
        },
      })
    );
  });

  it('rejects a dependency that is too long', () => {
    expectParseError(
      serviceMapConnectionFailedCallsRoute.params!.safeParse({
        query: { ...connectionQuery, dependencies: 'a'.repeat(513) },
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

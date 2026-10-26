/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodSafeParseResult } from '@kbn/zod/v4';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { servicesFlamegraphRoute } from './flamegraph';
import { servicesFunctionsRoute } from './functions';
import { profilingHostsFlamegraphRoute } from './hosts_flamegraph';
import { profilingHostsFunctionsRoute } from './hosts_functions';
import { servicesProfilingSchemasRoute } from './schemas';
import { profilingHostsSchemasRoute } from './hosts_schemas';

describe('servicesFlamegraphRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = servicesFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        transactionType: 'request',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing transactionType', () => {
    const result = servicesFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('servicesFunctionsRoute params', () => {
  it('accepts a valid path and query, coercing indices to numbers', () => {
    const result = servicesFunctionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        startIndex: '0',
        endIndex: '10',
        transactionType: 'request',
      },
    });

    expectParseSuccess(result);
    expect(result.data?.query.startIndex).toBe(0);
    expect(result.data?.query.endIndex).toBe(10);
  });

  it('rejects a missing serviceName', () => {
    const result = servicesFunctionsRoute.params!.safeParse({
      path: {},
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        startIndex: '0',
        endIndex: '10',
        transactionType: 'request',
      },
    });

    expectParseError(result);
  });
});

describe('profilingHostsFlamegraphRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = profilingHostsFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid documentType', () => {
    const result = profilingHostsFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'notARealDocumentType',
        rollupInterval: RollupInterval.OneMinute,
      },
    });

    expectParseError(result);
  });
});

describe('profilingHostsFunctionsRoute params', () => {
  it('accepts a valid path and query, coercing indices to numbers', () => {
    const result = profilingHostsFunctionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
        startIndex: '0',
        endIndex: '10',
      },
    });

    expectParseSuccess(result);
    expect(result.data?.query.startIndex).toBe(0);
    expect(result.data?.query.endIndex).toBe(10);
  });

  it('rejects a missing rollupInterval', () => {
    const result = profilingHostsFunctionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: ApmDocumentType.TransactionMetric,
        startIndex: '0',
        endIndex: '10',
      },
    });

    expectParseError(result);
  });
});

describe('servicesProfilingSchemasRoute params', () => {
  const query = {
    kuery: '',
    environment: 'production',
    start: '2021-01-01T00:00:00.000Z',
    end: '2021-01-02T00:00:00.000Z',
    transactionType: 'request',
  };

  it('accepts a valid path and query', () => {
    expectParseSuccess(
      servicesProfilingSchemasRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: { ...query, transactionName: 'GET /orders' },
      })
    );
  });

  it('rejects a missing transactionType', () => {
    const { transactionType, ...queryWithoutTransactionType } = query;

    expectParseError(
      servicesProfilingSchemasRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: queryWithoutTransactionType,
      })
    );
  });
});

describe('profilingHostsSchemasRoute params', () => {
  const query = {
    kuery: '',
    environment: 'production',
    start: '2021-01-01T00:00:00.000Z',
    end: '2021-01-02T00:00:00.000Z',
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
  };

  it('accepts a valid path and query', () => {
    expectParseSuccess(
      profilingHostsSchemasRoute.params!.safeParse({ path: { serviceName: 'opbeans-node' }, query })
    );
  });

  it('rejects an invalid documentType', () => {
    expectParseError(
      profilingHostsSchemasRoute.params!.safeParse({
        path: { serviceName: 'opbeans-node' },
        query: { ...query, documentType: 'notARealDocumentType' },
      })
    );
  });
});

describe('profiling schema param', () => {
  const path = { serviceName: 'opbeans-java' };
  const range = { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' };
  const servicesQuery = {
    kuery: '',
    environment: 'production',
    ...range,
    transactionType: 'request',
  };
  const hostsQuery = {
    kuery: '',
    environment: 'production',
    ...range,
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
  };
  const indices = { startIndex: '0', endIndex: '10' };

  // Generic so that each route's parse result keeps its own type
  const describeSchemaParam = <Output extends { query: { schema?: ProfilingSchema } }>(
    routeName: string,
    parse: (schema?: string) => ZodSafeParseResult<Output>
  ) =>
    describe(routeName, () => {
      it.each(Object.values(ProfilingSchema))('accepts the %s schema', (schema) => {
        const result = parse(schema);

        expectParseSuccess(result);
        expect(result.data.query.schema).toBe(schema);
      });

      it('leaves the schema to the default of the profiling APIs when it is not sent', () => {
        const result = parse();

        expectParseSuccess(result);
        expect(result.data.query.schema).toBeUndefined();
      });

      it('rejects an unknown schema', () => {
        expectParseError(parse('semconv'));
      });
    });

  describeSchemaParam('servicesFlamegraphRoute', (schema) =>
    servicesFlamegraphRoute.params!.safeParse({ path, query: { ...servicesQuery, schema } })
  );
  describeSchemaParam('servicesFunctionsRoute', (schema) =>
    servicesFunctionsRoute.params!.safeParse({
      path,
      query: { ...servicesQuery, ...indices, schema },
    })
  );
  describeSchemaParam('profilingHostsFlamegraphRoute', (schema) =>
    profilingHostsFlamegraphRoute.params!.safeParse({ path, query: { ...hostsQuery, schema } })
  );
  describeSchemaParam('profilingHostsFunctionsRoute', (schema) =>
    profilingHostsFunctionsRoute.params!.safeParse({
      path,
      query: { ...hostsQuery, ...indices, schema },
    })
  );
});

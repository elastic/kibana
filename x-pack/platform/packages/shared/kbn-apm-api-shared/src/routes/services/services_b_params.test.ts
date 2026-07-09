/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { serviceMetadataDetailsRoute } from './service_metadata_details';
import { serviceMetadataIconsRoute } from './service_metadata_icons';
import { serviceMixedIngestionRoute } from './service_mixed_ingestion';
import { serviceNodeMetadataRoute } from './service_node_metadata';
import { serviceSlosRoute } from './service_slos';
import { serviceThroughputRoute } from './service_throughput';
import { serviceTransactionTypesRoute } from './service_transaction_types';
import { servicesDetailedStatisticsRoute } from './services_detailed_statistics';
import { servicesListRoute } from './services_list';

describe('serviceMetadataDetailsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceMetadataDetailsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    expectParseError(
      serviceMetadataDetailsRoute.params!.safeParse({
        path: {},
        query: {
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          environment: 'production',
        },
      })
    );
  });
});

describe('serviceMetadataIconsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceMetadataIconsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing query', () => {
    expectParseError(
      serviceMetadataIconsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {},
      })
    );
  });
});

describe('serviceMixedIngestionRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceMixedIngestionRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
        kuery: '',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing kuery', () => {
    expectParseError(
      serviceMixedIngestionRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          environment: 'production',
        },
      })
    );
  });
});

describe('serviceNodeMetadataRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceNodeMetadataRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java', serviceNodeName: 'instance-1' },
      query: {
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceNodeName', () => {
    expectParseError(
      serviceNodeMetadataRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          environment: 'production',
          documentType: 'transactionMetric',
          rollupInterval: '1m',
        },
      })
    );
  });
});

describe('serviceSlosRoute params', () => {
  it('accepts a valid path and query without optional fields', () => {
    const result = serviceSlosRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: { environment: 'production', page: '1', perPage: '10' },
    });

    expectParseSuccess(result);
  });

  it('accepts a valid statusFilters JSON string', () => {
    const result = serviceSlosRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        page: '1',
        perPage: '10',
        statusFilters: JSON.stringify(['VIOLATED', 'HEALTHY']),
        kqlQuery: 'foo: bar',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.statusFilters).toEqual(['VIOLATED', 'HEALTHY']);
    }
  });

  it('rejects an invalid statusFilters JSON string', () => {
    expectParseError(
      serviceSlosRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          page: '1',
          perPage: '10',
          statusFilters: 'not-json',
        },
      })
    );
  });

  it('rejects a missing page', () => {
    expectParseError(
      serviceSlosRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: { environment: 'production', perPage: '10' },
      })
    );
  });
});

describe('serviceThroughputRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceThroughputRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        bucketSizeInSeconds: '60',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing bucketSizeInSeconds', () => {
    expectParseError(
      serviceThroughputRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          documentType: 'transactionMetric',
          rollupInterval: '1m',
        },
      })
    );
  });
});

describe('serviceTransactionTypesRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceTransactionTypesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing documentType', () => {
    expectParseError(
      serviceTransactionTypesRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          rollupInterval: '1m',
        },
      })
    );
  });
});

describe('servicesDetailedStatisticsRoute params', () => {
  it('accepts a valid query and body', () => {
    const result = servicesDetailedStatisticsRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
        bucketSizeInSeconds: '60',
        probability: '1',
      },
      body: { serviceNames: JSON.stringify(['opbeans-java', 'opbeans-node']) },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.body.serviceNames).toEqual(['opbeans-java', 'opbeans-node']);
    }
  });

  it('rejects an invalid serviceNames JSON string', () => {
    expectParseError(
      servicesDetailedStatisticsRoute.params!.safeParse({
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          documentType: 'transactionMetric',
          rollupInterval: '1m',
          bucketSizeInSeconds: '60',
          probability: '1',
        },
        body: { serviceNames: 'not-json' },
      })
    );
  });
});

describe('servicesListRoute params', () => {
  it('accepts a minimal valid query', () => {
    const result = servicesListRoute.params!.safeParse({
      query: {
        probability: '1',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
        useDurationSummary: 'true',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.useDurationSummary).toBe(true);
    }
  });

  it('accepts optional searchQuery/serviceGroup', () => {
    const result = servicesListRoute.params!.safeParse({
      query: {
        searchQuery: 'foo',
        serviceGroup: 'bar',
        probability: '1',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
        useDurationSummary: 'false',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('defaults useDurationSummary to false when missing', () => {
    const result = servicesListRoute.params!.safeParse({
      query: {
        probability: '1',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.useDurationSummary).toBe(false);
    }
  });
});

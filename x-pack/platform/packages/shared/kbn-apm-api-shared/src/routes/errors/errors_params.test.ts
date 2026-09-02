/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { errorDistributionRoute } from './error_distribution';
import { errorGroupSamplesRoute } from './error_group_samples';
import { errorsDetailedStatisticsRoute } from './error_groups_detailed_statistics';
import {
  errorsMainStatisticsRoute,
  errorsMainStatisticsByTransactionNameRoute,
} from './error_groups_main_statistics';
import { errorSampleDetailsRoute } from './error_sample_details';
import { topErroneousTransactionsRoute } from './top_erroneous_transactions';

describe('errorDistributionRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = errorDistributionRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        bucketSizeInSeconds: '60',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    expectParseError(
      errorDistributionRoute.params!.safeParse({
        path: {},
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('errorGroupSamplesRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = errorGroupSamplesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java', groupId: 'abc123' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing groupId', () => {
    expectParseError(
      errorGroupSamplesRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('errorsDetailedStatisticsRoute params', () => {
  it('accepts a valid path, query and body', () => {
    const result = errorsDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { groupIds: JSON.stringify(['abc123', 'def456']) },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.body.groupIds).toEqual(['abc123', 'def456']);
    }
  });

  it('rejects a body with invalid JSON groupIds', () => {
    expectParseError(
      errorsDetailedStatisticsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          numBuckets: '20',
        },
        body: { groupIds: 'not-json' },
      })
    );
  });
});

describe('errorsMainStatisticsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = errorsMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        sortField: 'occurrences',
        sortDirection: 'desc',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid sortDirection', () => {
    expectParseError(
      errorsMainStatisticsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          sortDirection: 'sideways',
        },
      })
    );
  });
});

describe('errorsMainStatisticsByTransactionNameRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = errorsMainStatisticsByTransactionNameRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        transactionType: 'request',
        transactionName: 'GET /api',
        maxNumberOfErrorGroups: '5',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing transactionName', () => {
    expectParseError(
      errorsMainStatisticsByTransactionNameRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          transactionType: 'request',
          maxNumberOfErrorGroups: '5',
        },
      })
    );
  });
});

describe('errorSampleDetailsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = errorSampleDetailsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java', groupId: 'abc123', errorId: 'err1' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing errorId', () => {
    expectParseError(
      errorSampleDetailsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java', groupId: 'abc123' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('topErroneousTransactionsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = topErroneousTransactionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java', groupId: 'abc123' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        numBuckets: '20',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing numBuckets', () => {
    expectParseError(
      topErroneousTransactionsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java', groupId: 'abc123' },
        query: {
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

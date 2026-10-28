/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { rootTransactionByTraceIdRoute } from './root_transaction_by_trace_id';
import { spanFromTraceByIdRoute } from './span_from_trace_by_id';
import { tracesRoute } from './traces';
import { transactionByIdRoute } from './transaction_by_id';
import { transactionByNameRoute } from './transaction_by_name';
import { transactionFromTraceByIdRoute } from './transaction_from_trace_by_id';
import { unifiedTraceSpanRoute } from './unified_trace_span';
import { unifiedTracesByIdErrorsRoute } from './unified_traces_by_id_errors';
import { unifiedTracesByIdSummaryRoute } from './unified_traces_by_id_summary';
import { unifiedTracesByIdRoute } from './unified_traces_by_id';
import { unifiedTracesRootSpanRoute } from './unified_traces_root_span';

describe('rootTransactionByTraceIdRoute params', () => {
  it('accepts a traceId and range query', () => {
    const result = rootTransactionByTraceIdRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing traceId', () => {
    expectParseError(
      rootTransactionByTraceIdRoute.params!.safeParse({
        path: {},
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('spanFromTraceByIdRoute params', () => {
  it('accepts a traceId/spanId and range query', () => {
    const result = spanFromTraceByIdRoute.params!.safeParse({
      path: { traceId: 'abc', spanId: 'def' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional parentTransactionId', () => {
    const result = spanFromTraceByIdRoute.params!.safeParse({
      path: { traceId: 'abc', spanId: 'def' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        parentTransactionId: 'ghi',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing spanId', () => {
    expectParseError(
      spanFromTraceByIdRoute.params!.safeParse({
        path: { traceId: 'abc' },
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('tracesRoute params', () => {
  it('accepts environment/kuery/range/probability query', () => {
    const result = tracesRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        probability: '0.5',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing environment', () => {
    expectParseError(
      tracesRoute.params!.safeParse({
        query: {
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          probability: '0.5',
        },
      })
    );
  });
});

describe('transactionByIdRoute params', () => {
  it('accepts a transactionId and range query', () => {
    const result = transactionByIdRoute.params!.safeParse({
      path: { transactionId: 'abc' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing transactionId', () => {
    expectParseError(
      transactionByIdRoute.params!.safeParse({
        path: {},
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('transactionByNameRoute params', () => {
  it('accepts transactionName/serviceName and range query', () => {
    const result = transactionByNameRoute.params!.safeParse({
      query: {
        transactionName: 'GET /api',
        serviceName: 'opbeans-java',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional environment', () => {
    const result = transactionByNameRoute.params!.safeParse({
      query: {
        transactionName: 'GET /api',
        serviceName: 'opbeans-java',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    expectParseError(
      transactionByNameRoute.params!.safeParse({
        query: {
          transactionName: 'GET /api',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('transactionFromTraceByIdRoute params', () => {
  it('accepts a traceId/transactionId and range query', () => {
    const result = transactionFromTraceByIdRoute.params!.safeParse({
      path: { traceId: 'abc', transactionId: 'def' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing transactionId', () => {
    expectParseError(
      transactionFromTraceByIdRoute.params!.safeParse({
        path: { traceId: 'abc' },
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('unifiedTraceSpanRoute params', () => {
  it('accepts a traceId/spanId and range query', () => {
    const result = unifiedTraceSpanRoute.params!.safeParse({
      path: { traceId: 'abc', spanId: 'def' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing traceId', () => {
    expectParseError(
      unifiedTraceSpanRoute.params!.safeParse({
        path: { spanId: 'def' },
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('unifiedTracesByIdErrorsRoute params', () => {
  it('accepts a traceId and range query', () => {
    const result = unifiedTracesByIdErrorsRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional docId', () => {
    const result = unifiedTracesByIdErrorsRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        docId: 'doc-1',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing traceId', () => {
    expectParseError(
      unifiedTracesByIdErrorsRoute.params!.safeParse({
        path: {},
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('unifiedTracesByIdSummaryRoute params', () => {
  it('accepts a traceId and range query', () => {
    const result = unifiedTracesByIdSummaryRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('accepts optional maxTraceItems/docId and coerces maxTraceItems to a number', () => {
    const result = unifiedTracesByIdSummaryRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        maxTraceItems: '500',
        docId: 'doc-1',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.maxTraceItems).toBe(500);
    }
  });

  it('rejects a missing traceId', () => {
    expectParseError(
      unifiedTracesByIdSummaryRoute.params!.safeParse({
        path: {},
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('unifiedTracesByIdRoute params', () => {
  it('accepts a traceId and range query', () => {
    const result = unifiedTracesByIdRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('accepts optional serviceName/entryTransactionId/ecsOnly and coerces ecsOnly to a boolean', () => {
    const result = unifiedTracesByIdRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        serviceName: 'opbeans-java',
        entryTransactionId: 'def',
        ecsOnly: 'true',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.ecsOnly).toBe(true);
    }
  });

  it('rejects an invalid ecsOnly value', () => {
    expectParseError(
      unifiedTracesByIdRoute.params!.safeParse({
        path: { traceId: 'abc' },
        query: {
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          ecsOnly: 'not-a-boolean',
        },
      })
    );
  });
});

describe('unifiedTracesRootSpanRoute params', () => {
  it('accepts a traceId and range query', () => {
    const result = unifiedTracesRootSpanRoute.params!.safeParse({
      path: { traceId: 'abc' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing traceId', () => {
    expectParseError(
      unifiedTracesRootSpanRoute.params!.safeParse({
        path: {},
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { esqlCompileEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];

const round = (message: string): EvidenceRound => ({
  input: { message: 'query' },
  steps: [],
  response: { message },
});

const createEsClient = (rejects?: Error) => {
  const requestMock = jest.fn();
  if (rejects) {
    requestMock.mockRejectedValue(
      Object.assign(rejects, {
        meta: { body: { error: { reason: rejects.message } } },
      })
    );
  } else {
    requestMock.mockResolvedValue({});
  }
  return {
    esClient: { transport: { request: requestMock } } as unknown as ElasticsearchClient,
    requestMock,
  };
};

describe('esql-compile', () => {
  it('passes when no ES|QL is present', async () => {
    const { esClient } = createEsClient();
    await expect(
      esqlCompileEvaluator.evaluate({
        trace: { traceId, esClient },
        round: round('No queries here'),
        log,
      })
    ).resolves.toEqual({
      scores: [
        {
          name: 'esql-compile',
          score: 1,
          label: 'pass',
          explanation: 'No ES|QL queries to compile',
        },
      ],
    });
  });

  it('is not applicable when queries are present but no trace gives access to Elasticsearch', async () => {
    await expect(
      esqlCompileEvaluator.evaluate({
        round: round('```esql\nFROM logs-*\n| LIMIT 5\n```'),
        log,
      })
    ).resolves.toEqual({
      scores: [],
      notApplicable: { reason: 'No Elasticsearch access without a trace' },
    });
  });

  it('compiles a fenced query with a pipe once, without a fence-polluted inline copy', async () => {
    const { esClient, requestMock } = createEsClient();
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('Run this:\n```esql\nFROM logs-*\n| LIMIT 5\n```\nDone.'),
      log,
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { query: 'FROM logs-*\n| LIMIT 5\n| LIMIT 0' } })
    );
    expect(result.scores[0].score).toBe(1);
  });

  it('still compiles an inline query that sits next to a fenced one', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| LIMIT 5\n```\nAlso FROM metrics-* | STATS count()'),
      log,
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('appends LIMIT 0 even after an existing LIMIT', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| LIMIT 10\n```'),
      log,
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/_query',
        body: { query: 'FROM logs-*\n| LIMIT 10\n| LIMIT 0' },
      })
    );
  });

  it('keeps LIMIT 0 out of a trailing line comment', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-* | WHERE x > 1 // check\n```'),
      log,
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { query: 'FROM logs-* | WHERE x > 1 // check\n| LIMIT 0' },
      })
    );
  });

  it('appends LIMIT 0 when the query has no LIMIT', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| WHERE x > 1\n```'),
      log,
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/_query',
        body: { query: 'FROM logs-*\n| WHERE x > 1\n| LIMIT 0' },
      })
    );
  });

  it('fails when ES rejects the query', async () => {
    const { esClient } = createEsClient(new Error('Unknown column [foo]'));
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| EVAL bad = foo\n```'),
      log,
    });
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].label).toBe('fail');
    expect(result.scores[0].explanation).toContain('Unknown column');
  });

  it('scores partial failures proportionally', async () => {
    const { esClient, requestMock } = createEsClient();
    requestMock.mockImplementation(({ body }: { body: { query: string } }) =>
      body.query.includes('bad-index')
        ? Promise.reject(new Error('index not found'))
        : Promise.resolve({})
    );
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n```\n```esql\nFROM bad-index-xyz\n```'),
      log,
    });
    expect(result.scores[0].score).toBe(0.5);
    expect(result.scores[0].label).toBe('fail');
  });

  it('ignores ES|QL that appears only in a tool result', async () => {
    const { esClient, requestMock } = createEsClient();
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: {
        input: { message: 'query' },
        steps: [{ tool_id: 'x', arguments: {}, result: '```esql\nFROM logs-*\n| LIMIT 1\n```' }],
        response: { message: 'done' },
      },
      log,
    });
    expect(requestMock).not.toHaveBeenCalled();
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('does not read prose "from" followed by a markdown table as a query', async () => {
    const { esClient, requestMock } = createEsClient();
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('Data from last week\n\n| host | count |\n| a | 1 |'),
      log,
    });
    expect(requestMock).not.toHaveBeenCalled();
    expect(result.scores[0]).toMatchObject({ score: 1 });
  });

  it('stops an inline query at the next line that does not continue with a pipe', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('FROM logs-* | WHERE x > 1\n  | LIMIT 5\nThis returns rows.'),
      log,
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { query: 'FROM logs-* | WHERE x > 1\n  | LIMIT 5\n| LIMIT 0' },
      })
    );
  });

  it('compiles an inline tool-argument query without the following argument values', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: {
        input: { message: 'query' },
        steps: [{ tool_id: 'x', arguments: { query: 'FROM logs-* | LIMIT 1', note: 'tagged' } }],
        response: { message: 'done' },
      },
      log,
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { query: 'FROM logs-* | LIMIT 1\n| LIMIT 0' } })
    );
  });
});

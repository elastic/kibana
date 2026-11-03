/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { MAX_ES_RESPONSE_SIZE_BYTES } from '../../constants';
import { executeEsql } from './execute_esql';

describe('executeEsql', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const esqlResponse = {
    columns: [{ name: 'foo', type: 'keyword' as const }],
    values: [['bar']],
  };

  const frozenExclusion = { bool: { must_not: [{ term: { _tier: 'data_frozen' } }] } };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(esqlResponse);
  });

  const lastRequest = () => esClient.esql.query.mock.calls[0][0];

  it('passes the query through with the standard request options', async () => {
    const result = await executeEsql({ query: 'FROM idx', esClient });

    expect(lastRequest()).toEqual({
      query: 'FROM idx',
      drop_null_columns: true,
      allow_partial_results: true,
      filter: frozenExclusion,
    });
    expect(esClient.esql.query.mock.calls[0][1]).toEqual({
      maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES,
    });
    expect(result).toEqual(esqlResponse);
  });

  it('forwards dropNullColumns: false as drop_null_columns: false', async () => {
    await executeEsql({ query: 'FROM idx', dropNullColumns: false, esClient });

    expect(lastRequest()).toEqual(expect.objectContaining({ drop_null_columns: false }));
  });

  it('excludes frozen tier indices by default', async () => {
    await executeEsql({ query: 'FROM idx', esClient });

    expect(lastRequest()).toEqual(expect.objectContaining({ filter: frozenExclusion }));
  });

  it('omits the filter key entirely when frozen tier indices are included', async () => {
    await executeEsql({ query: 'FROM idx', includeFrozen: true, esClient });

    expect(lastRequest()).not.toHaveProperty('filter');
  });

  it('combines a provided filter with the frozen tier exclusion', async () => {
    const filter = { term: { status: 'open' } };

    await executeEsql({ query: 'FROM idx', filter, esClient });

    expect(lastRequest()).toEqual(
      expect.objectContaining({
        filter: {
          bool: {
            filter: [filter],
            must_not: [{ term: { _tier: 'data_frozen' } }],
          },
        },
      })
    );
  });

  it('forwards the filter unchanged when frozen tier indices are included', async () => {
    const filter = { term: { status: 'open' } };

    await executeEsql({ query: 'FROM idx', filter, includeFrozen: true, esClient });

    expect(lastRequest()).toEqual(expect.objectContaining({ filter }));
  });

  it('sends params and filter together without either overwriting the other', async () => {
    const filter = { range: { '@timestamp': { gte: 'now-1h' } } };

    await executeEsql({
      query: 'FROM idx | WHERE host == ?host',
      params: [{ host: 'server-1' }],
      filter,
      includeFrozen: true,
      esClient,
    });

    expect(lastRequest()).toEqual(
      expect.objectContaining({
        query: 'FROM idx | WHERE host == ?host',
        params: [{ host: 'server-1' }],
        filter,
      })
    );
  });

  it('applies the limit to the query while leaving the filter untouched', async () => {
    const filter = { term: { status: 'open' } };

    await executeEsql({ query: 'FROM idx', limit: 10, filter, includeFrozen: true, esClient });

    expect(lastRequest()).toEqual(
      expect.objectContaining({ query: 'FROM idx | LIMIT 10', filter })
    );
  });

  it('translates a maximum-response-size abort into an actionable error', async () => {
    esClient.esql.query.mockRejectedValue(
      new errors.RequestAbortedError(
        'The content length (9000) is bigger than the maximum allowed buffer (42)'
      )
    );

    await expect(executeEsql({ query: 'FROM idx', esClient })).rejects.toThrow(
      /exceeded the maximum allowed size of 20MB/
    );
  });

  describe('timeoutMs', () => {
    let controller: AbortController;
    let timeoutSpy: jest.SpyInstance;

    beforeEach(() => {
      controller = new AbortController();
      timeoutSpy = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    });

    afterEach(() => {
      timeoutSpy.mockRestore();
    });

    const requestOptions = () => esClient.esql.query.mock.calls[0][1];

    it('sends exactly the standard transport options when no deadline is set', async () => {
      await executeEsql({ query: 'FROM idx', esClient });

      expect(requestOptions()).toStrictEqual({ maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES });
      expect(timeoutSpy).not.toHaveBeenCalled();
    });

    it('sets a wall-clock deadline through a signal and disables retries', async () => {
      await executeEsql({ query: 'FROM idx', timeoutMs: 5000, esClient });

      expect(timeoutSpy).toHaveBeenCalledWith(5000);
      expect(requestOptions()).toStrictEqual({
        maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES,
        maxRetries: 0,
        signal: controller.signal,
      });
    });

    it('turns a deadline abort into an error that tells the agent not to re-run the query', async () => {
      esClient.esql.query.mockImplementation(async () => {
        controller.abort();
        throw new errors.RequestAbortedError('Request aborted');
      });

      const error = await executeEsql({ query: 'FROM idx', timeoutMs: 5000, esClient }).catch(
        (e: Error) => e
      );

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Stopped waiting for the ES|QL query after 5s');
      expect((error as Error).message).toContain('Do not re-run');
      expect((error as Error).message).toContain('narrow the time range');
      expect((error as Error).message).not.toContain('cancel');
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('omits the waited time when the client timeout fires before the deadline', async () => {
      esClient.esql.query.mockRejectedValue(new errors.TimeoutError('Request timed out'));

      const error = await executeEsql({ query: 'FROM idx', timeoutMs: 120_000, esClient }).catch(
        (e: Error) => e
      );

      expect((error as Error).message).toContain('Stopped waiting for the ES|QL query.');
      expect((error as Error).message).not.toContain(' after ');
      expect((error as Error).message).toContain('Do not re-run');
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('rethrows a client TimeoutError unchanged when no deadline is set', async () => {
      const error = new errors.TimeoutError('Request timed out');
      esClient.esql.query.mockRejectedValue(error);

      await expect(executeEsql({ query: 'FROM idx', esClient })).rejects.toBe(error);
    });

    it('keeps a maximum-response-size abort a size error even when the deadline has aborted', async () => {
      esClient.esql.query.mockImplementation(async () => {
        controller.abort();
        throw new errors.RequestAbortedError(
          'The content length (9000) is bigger than the maximum allowed buffer (42)'
        );
      });

      await expect(executeEsql({ query: 'FROM idx', timeoutMs: 5000, esClient })).rejects.toThrow(
        /exceeded the maximum allowed size of 20MB/
      );
    });

    it('rethrows an unrelated error unchanged even when the deadline has aborted', async () => {
      const error = new Error('verification_exception: unknown column [missing]');
      esClient.esql.query.mockImplementation(async () => {
        controller.abort();
        throw error;
      });

      await expect(executeEsql({ query: 'FROM idx', timeoutMs: 5000, esClient })).rejects.toThrow(
        error
      );
    });
  });

  it('rethrows any other Elasticsearch error unchanged', async () => {
    const error = new Error('verification_exception: unknown column [missing]');
    esClient.esql.query.mockRejectedValue(error);

    await expect(
      executeEsql({ query: 'FROM idx', filter: { term: { status: 'open' } }, esClient })
    ).rejects.toThrow(error);
  });
});

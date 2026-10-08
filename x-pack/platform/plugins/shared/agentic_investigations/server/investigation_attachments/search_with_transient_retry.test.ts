/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredInvestigationAttachment } from '../../common/investigation_attachments';
import type { InvestigationAttachmentStorage } from './attachment_doc_service';
import {
  isIndexNotFoundError,
  isShardUnavailableError,
  retryWhileShardUnavailable,
  TRANSIENT_SEARCH_RETRY_DELAYS_MS,
  withTransientSearchRetry,
} from './search_with_transient_retry';

const esError = (statusCode: number, error: object) =>
  Object.assign(new Error('elasticsearch error'), { statusCode, body: { error } });

const noShardAvailable = () =>
  esError(503, {
    type: 'search_phase_execution_exception',
    reason: 'all shards failed',
    root_cause: [{ type: 'no_shard_available_action_exception' }],
  });

const allShardsFailed = () =>
  esError(503, { type: 'search_phase_execution_exception', reason: 'all shards failed' });

const indexNotFound = () =>
  esError(404, { type: 'index_not_found_exception', reason: 'no such index' });

const request = { track_total_hits: false, size: 1, query: { match_all: {} } };

const hit = { _index: '.kibana-test', _id: 'a', _source: { spaceId: 's', conversationId: 'c' } };

const setup = (outcomes: Array<Error | 'hits'>) => {
  const search: jest.MockedFunction<
    InvestigationAttachmentStorage<StoredInvestigationAttachment>['search']
  > = jest.fn();
  for (const outcome of outcomes) {
    if (outcome === 'hits') {
      search.mockResolvedValueOnce({ hits: { hits: [hit] } });
    } else {
      search.mockRejectedValueOnce(outcome);
    }
  }
  return { search, retrying: withTransientSearchRetry(search) };
};

describe('isIndexNotFoundError', () => {
  it('matches a missing index, directly or as every root cause of a search phase failure', () => {
    expect(isIndexNotFoundError(indexNotFound())).toBe(true);
    expect(
      isIndexNotFoundError(
        esError(404, {
          type: 'search_phase_execution_exception',
          root_cause: [{ type: 'index_not_found_exception' }],
        })
      )
    ).toBe(true);
    expect(isIndexNotFoundError(Object.assign(new Error('not found'), { statusCode: 404 }))).toBe(
      true
    );
  });

  it('does not match unavailable shards or other errors', () => {
    expect(isIndexNotFoundError(noShardAvailable())).toBe(false);
    expect(isIndexNotFoundError(allShardsFailed())).toBe(false);
    expect(isIndexNotFoundError(new Error('boom'))).toBe(false);
  });
});

describe('isShardUnavailableError', () => {
  it('matches no available shard at any depth and an all-shards-failed 503', () => {
    expect(
      isShardUnavailableError(esError(503, { type: 'no_shard_available_action_exception' }))
    ).toBe(true);
    expect(isShardUnavailableError(noShardAvailable())).toBe(true);
    expect(
      isShardUnavailableError(
        esError(500, {
          type: 'search_phase_execution_exception',
          failed_shards: [{ reason: { type: 'no_shard_available_action_exception' } }],
        })
      )
    ).toBe(true);
    expect(isShardUnavailableError(allShardsFailed())).toBe(true);
  });

  it('does not match a bad request or a missing index', () => {
    expect(
      isShardUnavailableError(
        esError(400, {
          type: 'search_phase_execution_exception',
          root_cause: [{ type: 'query_shard_exception' }],
        })
      )
    ).toBe(false);
    expect(isShardUnavailableError(indexNotFound())).toBe(false);
  });
});

describe('withTransientSearchRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads a missing index as no hits without retrying', async () => {
    const { search, retrying } = setup([indexNotFound()]);

    await expect(retrying(request)).resolves.toEqual({ hits: { hits: [] } });
    expect(search).toHaveBeenCalledTimes(1);
    // Forwards exactly the arguments it got, so callers asserting on the storage call see no extras.
    expect(search).toHaveBeenCalledWith(request);
  });

  it('retries a search no shard could answer and returns the first result', async () => {
    const { search, retrying } = setup([noShardAvailable(), allShardsFailed(), 'hits']);

    const result = retrying(request);
    await jest.advanceTimersByTimeAsync(
      TRANSIENT_SEARCH_RETRY_DELAYS_MS[0] + TRANSIENT_SEARCH_RETRY_DELAYS_MS[1]
    );

    await expect(result).resolves.toEqual({ hits: { hits: [hit] } });
    expect(search).toHaveBeenCalledTimes(3);
  });

  it('rethrows once the bounded retries are spent', async () => {
    const lastError = noShardAvailable();
    const { search, retrying } = setup([
      noShardAvailable(),
      noShardAvailable(),
      noShardAvailable(),
      lastError,
    ]);

    const result = retrying(request);
    const assertion = expect(result).rejects.toBe(lastError);
    await jest.advanceTimersByTimeAsync(
      TRANSIENT_SEARCH_RETRY_DELAYS_MS.reduce((total, delay) => total + delay, 0)
    );

    await assertion;
    expect(search).toHaveBeenCalledTimes(TRANSIENT_SEARCH_RETRY_DELAYS_MS.length + 1);
  });

  it('rethrows other errors at once', async () => {
    const badRequest = esError(400, { type: 'parsing_exception' });
    const { search, retrying } = setup([badRequest]);

    await expect(retrying(request)).rejects.toBe(badRequest);
    expect(search).toHaveBeenCalledTimes(1);
  });
});

describe('retryWhileShardUnavailable', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries a read no shard could answer and returns its result', async () => {
    const read = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(esError(503, { type: 'no_shard_available_action_exception' }))
      .mockResolvedValueOnce('conversation');

    const result = retryWhileShardUnavailable(read);
    await jest.advanceTimersByTimeAsync(TRANSIENT_SEARCH_RETRY_DELAYS_MS[0]);

    await expect(result).resolves.toBe('conversation');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('rethrows a missing index and other errors at once', async () => {
    const missing = indexNotFound();
    const read = jest.fn<Promise<string>, []>().mockRejectedValueOnce(missing);

    await expect(retryWhileShardUnavailable(read)).rejects.toBe(missing);
    expect(read).toHaveBeenCalledTimes(1);
  });
});

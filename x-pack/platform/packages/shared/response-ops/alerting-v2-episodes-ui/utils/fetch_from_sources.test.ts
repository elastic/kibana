/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchFromSource, fetchFromV2AndSource, settleFetch } from './fetch_from_sources';
import { shouldSwallowFetchError } from './should_swallow_fetch_error';
import { createTestEpisodeSource } from '../types/episode_data_source.mock';

describe('settleFetch', () => {
  it('returns the result in results when the fetch succeeds', async () => {
    await expect(settleFetch('v2', async () => ['row'])).resolves.toEqual({
      results: [['row']],
      errors: [],
    });
  });

  it('returns the error without throwing when the fetch fails', async () => {
    const error = new Error('boom');
    await expect(settleFetch('v2', async () => Promise.reject(error))).resolves.toEqual({
      results: [],
      errors: [{ sourceId: 'v2', error }],
    });
  });

  it('wraps non-Error rejections', async () => {
    const result = await settleFetch('v2', async () => Promise.reject('nope'));
    expect(result.results).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toEqual(new Error('nope'));
  });

  describe('expression ErrorLike rejections', () => {
    const esqlSecurityError = {
      name: 'EsError',
      message: 'action [indices:data/read/esql] is unauthorized',
      original: {
        attributes: { error: { type: 'security_exception' } },
      },
    };

    it('keeps the name, message and original error as the cause', async () => {
      const {
        errors: [{ error }],
      } = await settleFetch('v2', async () => Promise.reject(esqlSecurityError));

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('EsError');
      expect(error.message).toBe('action [indices:data/read/esql] is unauthorized');
      expect(error.cause).toBe(esqlSecurityError);
    });

    it('is swallowed as a privilege error', async () => {
      const {
        errors: [{ error }],
      } = await settleFetch('v2', async () => Promise.reject(esqlSecurityError));

      expect(shouldSwallowFetchError(error)).toBe(true);
    });

    it('is still surfaced for non-privilege ES|QL errors', async () => {
      const {
        errors: [{ error }],
      } = await settleFetch('v2', async () =>
        Promise.reject({
          name: 'EsError',
          message: 'parsing error',
          original: { attributes: { error: { type: 'parsing_exception' } } },
        })
      );

      expect(error.message).toBe('parsing error');
      expect(shouldSwallowFetchError(error)).toBe(false);
    });

    it('keeps AbortError names so aborted queries are swallowed', async () => {
      const {
        errors: [{ error }],
      } = await settleFetch('v2', async () =>
        Promise.reject({ name: 'AbortError', message: 'The user aborted a request.' })
      );

      expect(shouldSwallowFetchError(error)).toBe(true);
    });
  });
});

describe('fetchFromSource', () => {
  it('returns an empty result when no source is provided', async () => {
    await expect(fetchFromSource(undefined, () => Promise.resolve([]))).resolves.toEqual({
      results: [],
      errors: [],
    });
  });

  it('returns an empty result when the source does not implement the run', async () => {
    const source = createTestEpisodeSource({ fetchKpis: undefined });
    await expect(fetchFromSource(source, (s) => s.fetchKpis?.({} as never))).resolves.toEqual({
      results: [],
      errors: [],
    });
  });

  it('returns the source id on failure', async () => {
    const error = new Error('source failure');
    const source = createTestEpisodeSource({
      fetchEpisodes: jest.fn().mockRejectedValue(error),
    });

    await expect(fetchFromSource(source, (s) => s.fetchEpisodes({} as never))).resolves.toEqual({
      results: [],
      errors: [{ sourceId: 'test-source', error }],
    });
  });
});

describe('fetchFromV2AndSource', () => {
  it('returns both results when v2 and the additional source succeed', async () => {
    const source = createTestEpisodeSource({
      fetchKpis: jest.fn().mockResolvedValue({ alerts_count: 10 }),
    });

    await expect(
      fetchFromV2AndSource({
        v2: async () => [{ alerts_count: 5 }],
        source,
        fromSource: (s) => s.fetchKpis?.({} as never),
      })
    ).resolves.toEqual({
      v2: [{ alerts_count: 5 }],
      additional: [{ alerts_count: 10 }],
      errors: [],
    });
  });

  it('keeps additional data when v2 fails', async () => {
    const v2Error = new Error('v2 boom');
    const source = createTestEpisodeSource({
      fetchKpis: jest.fn().mockResolvedValue({ alerts_count: 10 }),
    });

    await expect(
      fetchFromV2AndSource({
        v2: async () => Promise.reject(v2Error),
        source,
        fromSource: (s) => s.fetchKpis?.({} as never),
      })
    ).resolves.toEqual({
      v2: undefined,
      additional: [{ alerts_count: 10 }],
      errors: [{ sourceId: 'v2', error: v2Error }],
    });
  });

  it('keeps v2 data when the additional source fails', async () => {
    const sourceError = new Error('classic boom');
    const source = createTestEpisodeSource({
      fetchKpis: jest.fn().mockRejectedValue(sourceError),
    });

    await expect(
      fetchFromV2AndSource({
        v2: async () => [{ alerts_count: 5 }],
        source,
        fromSource: (s) => s.fetchKpis?.({} as never),
      })
    ).resolves.toEqual({
      v2: [{ alerts_count: 5 }],
      additional: [],
      errors: [{ sourceId: 'test-source', error: sourceError }],
    });
  });

  it('returns only v2 data when no additional source is provided', async () => {
    await expect(
      fetchFromV2AndSource({
        v2: async () => ['row'],
        source: undefined,
        fromSource: (s) => s.fetchKpis?.({} as never),
      })
    ).resolves.toEqual({
      v2: ['row'],
      additional: [],
      errors: [],
    });
  });

  it('skips v2 and returns only additional data when queryV2Source is false', async () => {
    const v2 = jest.fn();
    const source = createTestEpisodeSource({
      fetchKpis: jest.fn().mockResolvedValue({ alerts_count: 10 }),
    });

    await expect(
      fetchFromV2AndSource({
        v2,
        source,
        fromSource: (s) => s.fetchKpis?.({} as never),
        queryV2Source: false,
      })
    ).resolves.toEqual({
      v2: undefined,
      additional: [{ alerts_count: 10 }],
      errors: [],
    });
    expect(v2).not.toHaveBeenCalled();
  });
});

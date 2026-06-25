/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchAllPagesWithConcurrency } from './fetch_all_pages_with_concurrency';

describe('fetchAllPagesWithConcurrency', () => {
  it('returns the first page when one page is enough', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      total: 2,
      data: ['a', 'b'],
    });

    const result = await fetchAllPagesWithConcurrency({
      perPage: 100,
      maxConcurrency: 4,
      fetchPage,
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['a', 'b']);
  });

  it('fetches remaining pages with bounded concurrency and stable order', async () => {
    let active = 0;
    let maxActive = 0;

    const fetchPage = jest.fn(async (page, perPage) => {
      active += 1;
      maxActive = Math.max(maxActive, active);

      await new Promise((resolve) => setTimeout(resolve, 5));

      active -= 1;
      return {
        total: 5,
        data: [`item-${page}-${perPage}`],
      };
    });

    const result = await fetchAllPagesWithConcurrency({
      perPage: 1,
      maxConcurrency: 2,
      fetchPage,
    });

    expect(fetchPage).toHaveBeenCalledTimes(5);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(result).toEqual(['item-1-1', 'item-2-1', 'item-3-1', 'item-4-1', 'item-5-1']);
  });

  it('defaults invalid concurrency values to a single worker', async () => {
    const fetchPage = jest.fn(async (page) => ({
      total: 3,
      data: [page],
    }));

    const result = await fetchAllPagesWithConcurrency({
      perPage: 1,
      maxConcurrency: 0,
      fetchPage,
    });

    expect(result).toEqual([1, 2, 3]);
  });

  it('rejects when any page fetch fails', async () => {
    const fetchPage = jest.fn(async (page) => {
      if (page === 3) {
        throw new Error('fetch failed');
      }
      return {
        total: 5,
        data: [page],
      };
    });

    await expect(
      fetchAllPagesWithConcurrency({
        perPage: 1,
        maxConcurrency: 3,
        fetchPage,
      })
    ).rejects.toThrow('fetch failed');
  });

  it('does not over-fetch when concurrency is larger than remaining pages', async () => {
    const fetchPage = jest.fn(async (page, perPage) => ({
      total: 2,
      data: [`${page}-${perPage}`],
    }));

    const result = await fetchAllPagesWithConcurrency({
      perPage: 1,
      maxConcurrency: 10,
      fetchPage,
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['1-1', '2-1']);
  });

  it('floors non-integer concurrency values', async () => {
    let active = 0;
    let maxActive = 0;
    const fetchPage = jest.fn(async (page) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;

      return {
        total: 4,
        data: [page],
      };
    });

    await fetchAllPagesWithConcurrency({
      perPage: 1,
      maxConcurrency: 2.9,
      fetchPage,
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('defaults non-finite concurrency values to one worker', async () => {
    const fetchPage = jest.fn(async (page) => ({
      total: 3,
      data: [page],
    }));

    const result = await fetchAllPagesWithConcurrency({
      perPage: 1,
      maxConcurrency: Number.NaN,
      fetchPage,
    });

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(result).toEqual([1, 2, 3]);
  });

  it('throws when perPage is invalid', async () => {
    const fetchPage = jest.fn();

    await expect(
      fetchAllPagesWithConcurrency({
        perPage: 0,
        maxConcurrency: 2,
        fetchPage,
      })
    ).rejects.toThrow('perPage must be a positive finite number');

    expect(fetchPage).not.toHaveBeenCalled();
  });
});

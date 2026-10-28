/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from './constants';
import { resolveCustomContentQueries } from './resolve_custom_content_queries';

const generate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  generate.mockImplementation(async ({ description }: { description: string }) => {
    return `FROM generated | /* ${description} */ LIMIT 1`;
  });
});

describe('resolveCustomContentQueries', () => {
  describe('a new panel', () => {
    it('generates a query from each description, by position', async () => {
      const { queries, changed } = await resolveCustomContentQueries({
        datasets: [{ description: 'totals', index: 'logs' }, { description: 'top hosts' }],
        existingQueries: [],
        generate,
      });

      expect(queries).toEqual([
        'FROM generated | /* totals */ LIMIT 1',
        'FROM generated | /* top hosts */ LIMIT 1',
      ]);
      expect(changed).toEqual([true, true]);
      expect(generate).toHaveBeenNthCalledWith(1, { description: 'totals', index: 'logs' }, [], 0);
      expect(generate).toHaveBeenNthCalledWith(
        2,
        { description: 'top hosts', index: undefined },
        [],
        1
      );
    });

    it('uses a supplied query as it is and does not generate it', async () => {
      const { queries } = await resolveCustomContentQueries({
        datasets: [{ esql: 'FROM mine' }, { description: 'top hosts' }],
        existingQueries: [],
        generate,
      });

      expect(queries[0]).toBe('FROM mine');
      expect(generate).toHaveBeenCalledTimes(1);
    });

    it('lets a supplied query win over a description', async () => {
      const { queries } = await resolveCustomContentQueries({
        datasets: [{ esql: 'FROM mine', description: 'ignored' }],
        existingQueries: [],
        generate,
      });

      expect(queries).toEqual(['FROM mine']);
      expect(generate).not.toHaveBeenCalled();
    });

    it('generates the queries in parallel', async () => {
      const started: string[] = [];
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      generate.mockImplementation(async ({ description }: { description: string }) => {
        started.push(description);
        await gate;
        return `FROM ${description}`;
      });

      const pending = resolveCustomContentQueries({
        datasets: [{ description: 'a' }, { description: 'b' }, { description: 'c' }],
        existingQueries: [],
        generate,
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(started).toEqual(['a', 'b', 'c']);
      release();
      await expect(pending).resolves.toMatchObject({ queries: ['FROM a', 'FROM b', 'FROM c'] });
    });

    it.each([[{}], [{ index: 'logs' }], [{ description: '  ' }]])(
      'rejects a dataset with nothing to build a query from: %j',
      async (dataset) => {
        await expect(
          resolveCustomContentQueries({
            datasets: [{ description: 'ok' }, dataset],
            existingQueries: [],
            generate,
          })
        ).rejects.toThrow(/Dataset 2 adds a new query, so it needs a `description` or an `esql`/);
      }
    );
  });

  describe('an existing panel', () => {
    const existingQueries = ['FROM main', 'FROM second', 'FROM third'];

    it('keeps the queries of empty datasets and of positions the list does not reach', async () => {
      const { queries, changed } = await resolveCustomContentQueries({
        datasets: [{}],
        existingQueries,
        generate,
      });

      expect(queries).toEqual(existingQueries);
      expect(changed).toEqual([false, false, false]);
      expect(generate).not.toHaveBeenCalled();
    });

    it('regenerates only the position that has a description, seeded with its stored query', async () => {
      const { queries, changed } = await resolveCustomContentQueries({
        datasets: [{}, { description: 'top 10 hosts' }],
        existingQueries,
        generate,
      });

      expect(queries).toEqual([
        'FROM main',
        'FROM generated | /* top 10 hosts */ LIMIT 1',
        'FROM third',
      ]);
      expect(changed).toEqual([false, true, false]);
      expect(generate).toHaveBeenCalledTimes(1);
      expect(generate).toHaveBeenCalledWith(
        { description: 'top 10 hosts', index: undefined },
        ['FROM second'],
        1
      );
    });

    it('replaces the query at a position with a supplied one', async () => {
      const { queries, changed } = await resolveCustomContentQueries({
        datasets: [{}, {}, { esql: 'FROM replaced' }],
        existingQueries,
        generate,
      });

      expect(queries).toEqual(['FROM main', 'FROM second', 'FROM replaced']);
      expect(changed).toEqual([false, false, true]);
    });

    it('reports an unchanged position as unchanged when its replacement is identical', async () => {
      const { changed } = await resolveCustomContentQueries({
        datasets: [{ esql: 'FROM main' }],
        existingQueries,
        generate,
      });
      expect(changed[0]).toBe(false);
    });

    it('adds a query after the stored ones', async () => {
      const { queries, changed } = await resolveCustomContentQueries({
        datasets: [{}, {}, {}, { description: 'a fourth' }],
        existingQueries,
        generate,
      });

      expect(queries).toHaveLength(4);
      expect(queries[3]).toContain('a fourth');
      expect(changed).toEqual([false, false, false, true]);
      expect(generate).toHaveBeenCalledWith({ description: 'a fourth', index: undefined }, [], 3);
    });

    it('rejects a new position with nothing to build a query from', async () => {
      await expect(
        resolveCustomContentQueries({
          datasets: [{}, {}, {}, {}],
          existingQueries,
          generate,
        })
      ).rejects.toThrow(/Dataset 4 adds a new query/);
    });
  });

  it('rejects a list that would leave the panel with more queries than it can hold', async () => {
    const datasets = Array.from({ length: CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1 }, () => ({
      esql: 'FROM x',
    }));
    await expect(
      resolveCustomContentQueries({ datasets, existingQueries: [], generate })
    ).rejects.toThrow(/holds at most 5 queries/);
  });

  it('fails when a query cannot be generated, naming nothing that was half-applied', async () => {
    generate.mockRejectedValueOnce(new Error('no query produced'));
    await expect(
      resolveCustomContentQueries({
        datasets: [{ description: 'a' }, { description: 'b' }],
        existingQueries: [],
        generate,
      })
    ).rejects.toThrow('no query produced');
  });
});

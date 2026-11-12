/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  createDayBudget,
  createRateLimiter,
  createSummaryPressure,
  runCrawl,
  type CrawlPlan,
} from './crawl';
import type { SourceFile } from './sources';

const file = (id: string, folder = 'top'): SourceFile => ({
  id,
  name: `${id}.md`,
  isFolder: false,
  folder,
  modifiedAt: '2026-11-01T00:00:00.000Z',
  size: 5,
  url: `https://x/${id}`,
});

const setup = ({
  budget = 100,
  cached = new Map(),
  noModel = false,
}: { budget?: number; cached?: Map<string, unknown>; noModel?: boolean } = {}) => {
  const chat = noModel ? undefined : jest.fn().mockResolvedValue('{"summary":"About it."}');
  const files: Record<string, SourceFile> = { a: file('a'), b: file('b'), c: file('c', 'other') };
  const source = {
    list: jest.fn(async ({ folder }: { folder: string }) => ({
      files: Object.values(files).filter((f) => f.folder === (folder || 'top')),
      truncated: false,
    })),
    stat: jest.fn(async (id: string) => {
      if (!files[id]) {
        throw new Error('not found');
      }
      return files[id];
    }),
    readText: jest.fn(async () => 'Some text of the file.'),
    canOpen: jest.fn(),
  };
  const store = {
    cached: jest.fn().mockResolvedValue(cached),
    remember: jest.fn().mockResolvedValue(true),
  };
  const run = (plan: Partial<CrawlPlan>, over: Record<string, unknown> = {}) =>
    runCrawl(
      { maxDepth: 1, mode: 'names', files: [], fileMode: 'full', maxItems: 100, ...plan },
      {
        store: store as never,
        esClient: elasticsearchServiceMock.createElasticsearchClient(),
        spaceId: 'default',
        connectorId: 'drive-1',
        connectorType: '.google_drive',
        source,
        permission: { scope: 'per_user', profileUid: 'u_a' },
        chat,
        budget: createDayBudget(budget),
        limiter: createRateLimiter(100000),
        pressure: createSummaryPressure({ maxConcurrent: 2, perMinute: 100000 }),
        ...over,
      }
    );
  const written = () =>
    store.remember.mock.calls.map(([call]) => [call.file.id, call.summary?.kind ?? 'names']);
  return { source, store, run, written, chat };
};

describe('runCrawl', () => {
  it('remembers a folder’s files by name without reading any of them', async () => {
    const { source, run, written } = setup();

    const result = await run({ folder: '' });

    expect(source.readText).not.toHaveBeenCalled();
    expect(written().sort()).toEqual([
      ['a', 'names'],
      ['b', 'names'],
    ]);
    expect(result).toMatchObject({
      planned: 2,
      written: 2,
      unchanged: 0,
      failed: 0,
      truncated: false,
    });
  });

  it('remembers a file read with a model summary, and the folder around it the same way', async () => {
    const { source, run, written } = setup();

    await run({ files: ['a'], around: 0 });

    expect(source.readText).toHaveBeenCalledTimes(2);
    expect(source.list).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'top', maxDepth: 0 })
    );
    // The file read and its neighbour are both summarized, and nothing is remembered twice.
    expect(written().sort()).toEqual([
      ['a', 'llm'],
      ['b', 'llm'],
    ]);
  });

  it('only names the file and its neighbours when the file is remembered by name', async () => {
    const { source, run, written } = setup();

    await run({ files: ['a'], fileMode: 'names', around: 0 });

    expect(source.readText).not.toHaveBeenCalled();
    expect(written().sort()).toEqual([
      ['a', 'names'],
      ['b', 'names'],
    ]);
  });

  it('remembers files already seen by name, without looking them up or reading them', async () => {
    const { source, run, written } = setup();

    await run({ entries: [file('x'), file('y')] });

    expect(source.stat).not.toHaveBeenCalled();
    expect(source.readText).not.toHaveBeenCalled();
    expect(written().sort()).toEqual([
      ['x', 'names'],
      ['y', 'names'],
    ]);
  });

  it('writes the start of the file when there is no model', async () => {
    const { run, written } = setup({ noModel: true });

    await run({ files: ['a'] });

    expect(written()).toEqual([['a', 'excerpt']]);
  });

  it('does not read a file that is already summarized and unchanged, only names it', async () => {
    const { source, run, written } = setup({
      cached: new Map([['a', { kind: 'llm', modifiedAt: '2026-11-01T00:00:00.000Z', size: 5 }]]),
    });

    await run({ files: ['a'] });

    expect(source.readText).not.toHaveBeenCalled();
    expect(written()).toEqual([['a', 'names']]);
  });

  it('only names a file once the day’s reads are spent, and when it is not text', async () => {
    const spent = setup({ budget: 0 });
    await spent.run({ files: ['a', 'b'] });
    expect(spent.source.readText).not.toHaveBeenCalled();
    expect(spent.written().sort()).toEqual([
      ['a', 'names'],
      ['b', 'names'],
    ]);

    const notText = setup();
    notText.source.readText.mockResolvedValue(undefined as never);
    await notText.run({ files: ['a'] });
    expect(notText.written()).toEqual([['a', 'names']]);
  });

  it('leaves a file another run is already reading to that run', async () => {
    const pressure = createSummaryPressure({ maxConcurrent: 2, perMinute: 100000 });
    pressure.claim('default|drive-1|a');
    const { source, run, written } = setup();

    await run({ files: ['a', 'b'] }, { pressure });

    expect(source.readText).toHaveBeenCalledTimes(1);
    expect(written()).toEqual([['b', 'llm']]);
  });

  it('keeps an excerpt when the model fails, and stops asking it for a while', async () => {
    const { chat, run, written } = setup();
    chat?.mockRejectedValue(new Error('429 rate limited'));

    const result = await run({ files: ['a', 'b'] });

    expect(chat).toHaveBeenCalledTimes(1);
    expect(written().sort()).toEqual([
      ['a', 'excerpt'],
      ['b', 'excerpt'],
    ]);
    expect(result.failed).toBe(0);
  });

  it('shares its slots across runs, so only so many files are in flight at once', async () => {
    const pressure = createSummaryPressure({ maxConcurrent: 1, perMinute: 100000 });
    let active = 0;
    let peak = 0;
    const work = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    };

    await Promise.all([pressure.slot(work), pressure.slot(work), pressure.slot(work)]);

    expect(peak).toBe(1);
  });

  it('counts a missing file and a failed write as failures and carries on', async () => {
    const { store, run } = setup();
    store.remember.mockRejectedValueOnce(new Error('conflict'));

    const result = await run({ files: ['gone'], folder: '' });

    expect(result).toMatchObject({ failed: 2, written: 1 });
  });

  it('stops at the file limit, and stops between files once aborted', async () => {
    const limited = setup();
    expect(await limited.run({ folder: '', maxItems: 1 })).toMatchObject({
      planned: 1,
      truncated: true,
    });

    const aborted = setup();
    const controller = new AbortController();
    controller.abort();
    await aborted.run({ folder: '' }, { signal: controller.signal });
    expect(aborted.store.remember).not.toHaveBeenCalled();
  });
});

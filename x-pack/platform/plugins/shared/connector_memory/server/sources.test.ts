/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSource, readOf } from './sources';

describe('content source', () => {
  // The fake connector: top has a.md and a folder `sub`; sub has b.md and c.md. `flat` lists below it with depth.
  const entry = (id: string, folder: string, over: Record<string, unknown> = {}) => ({
    id,
    name: `${id}.md`,
    isFolder: false,
    folder,
    url: `https://example.test/${id}`,
    ...over,
  });
  const tree: Record<string, unknown[]> = {
    '': [entry('a', ''), entry('sub', '', { name: 'sub', isFolder: true })],
    sub: [entry('b', 'sub'), entry('c', 'sub')],
    flat: [entry('x', 'flat', { depth: 0 }), entry('y', 'flat/d', { depth: 1 })],
  };
  const execute = jest.fn(async (subAction: string, params: Record<string, unknown>) =>
    subAction === 'contextList' ? { entries: tree[String(params.folder)] ?? [] } : {}
  );
  const source = createSource(execute, 1000);

  it('walks folders to the depth asked, and filters a flat listing by the depth it reports', async () => {
    const shallow = await source.list({ folder: '', maxDepth: 0, maxFiles: 10 });
    const deep = await source.list({ folder: '', maxDepth: 1, maxFiles: 10 });
    const flat = await source.list({ folder: 'flat', maxDepth: 0, maxFiles: 10 });

    expect(shallow.files.map((f) => f.id)).toEqual(['a']);
    expect(deep.files.map((f) => [f.id, f.folder])).toEqual([
      ['a', ''],
      ['b', 'sub'],
      ['c', 'sub'],
    ]);
    expect(flat.files.map((f) => f.id)).toEqual(['x']);
  });

  it('stops at the file limit and says so', async () => {
    const result = await source.list({ folder: '', maxDepth: 1, maxFiles: 2 });

    expect(result.files).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it('reads text up to the download limit, and decides access from the connector’s own answer', async () => {
    const run = jest.fn();
    const probe = createSource(run, 1000);

    run.mockResolvedValueOnce({ text: 'hello' }).mockResolvedValueOnce({});
    expect(await probe.readText({ id: 'a' } as never)).toBe('hello');
    expect(await probe.readText({ id: 'a' } as never)).toBeUndefined();
    expect(run).toHaveBeenCalledWith('contextGetContent', { id: 'a', maxBytes: 1000 });

    run.mockResolvedValueOnce(entry('a', ''));
    expect(await probe.canOpen('a')).toEqual({ decision: 'allowed' });
    run.mockRejectedValueOnce(new Error('404 not found'));
    expect(await probe.canOpen('a')).toEqual({ decision: 'denied' });
    run.mockRejectedValueOnce(new Error('connection reset'));
    expect(await probe.canOpen('a')).toEqual({ decision: 'unknown', reason: 'connection reset' });
  });
});

describe('readOf', () => {
  it('counts only the connector’s declared download as a read, and builds the file id from its params', () => {
    expect(readOf('.google_drive', 'downloadFile', { fileId: 'a' })).toBe('a');
    expect(readOf('.google_drive', 'listFiles', { folderId: 'f' })).toBeUndefined();
    expect(readOf('.amazon_s3', 'downloadFile', { bucket: 'b', key: 'k/x.md' })).toBe('b/k/x.md');
    expect(readOf('.amazon_s3', 'downloadFile', { bucket: 'b' })).toBeUndefined();
    expect(readOf('.slack', 'downloadFile', { fileId: 'a' })).toBeUndefined();
  });
});

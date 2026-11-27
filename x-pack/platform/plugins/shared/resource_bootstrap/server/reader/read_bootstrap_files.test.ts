/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MAX_REPORTED_ERRORS } from '../../common';
import { BootstrapReadError, readBootstrapFiles } from './read_bootstrap_files';

const MAX_FILE_SIZE = 1024 * 1024;
const LIMITS = {
  maxFileSizeBytes: MAX_FILE_SIZE,
  maxTotalSizeBytes: 10 * MAX_FILE_SIZE,
  maxFiles: 100,
};

describe('readBootstrapFiles', () => {
  let root: string;

  const write = async (relativePath: string, content: string) => {
    const target = join(root, relativePath);
    await fs.mkdir(join(target, '..'), { recursive: true });
    await fs.writeFile(target, content);
  };

  const read = () => readBootstrapFiles({ path: root, ...LIMITS });

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'resource-bootstrap-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('groups documents by kind, across files', async () => {
    await write('main.data_view.json', JSON.stringify([{ id: 'a' }, { id: 'b' }]));
    await write('objects.dashboard.ndjson', '{"id":"c"}\n\n{"id":"d"}\n');
    await write('extra.data_view.json', JSON.stringify({ id: 'e' }));

    const { groups } = await read();

    expect(groups).toEqual([
      {
        kind: 'dashboard',
        documents: [
          { source: 'objects.dashboard.ndjson entry 1', body: { id: 'c' } },
          { source: 'objects.dashboard.ndjson entry 2', body: { id: 'd' } },
        ],
      },
      {
        kind: 'data_view',
        documents: [
          { source: 'extra.data_view.json entry 1', body: { id: 'e' } },
          { source: 'main.data_view.json entry 1', body: { id: 'a' } },
          { source: 'main.data_view.json entry 2', body: { id: 'b' } },
        ],
      },
    ]);
  });

  it('reads a file with more documents than the function argument limit', async () => {
    const count = 150_000;
    await write('many.data_view.json', JSON.stringify(Array.from({ length: count }, () => ({}))));

    const { groups } = await read();

    expect(groups[0].documents).toHaveLength(count);
    expect(groups[0].documents[count - 1]).toEqual({
      source: `many.data_view.json entry ${count}`,
      body: {},
    });
  });

  describe('the spaces field', () => {
    it('is taken off the document, which is read without it', async () => {
      await write(
        'main.data_view.json',
        JSON.stringify([{ id: 'a', spaces: ['team-a', 'team-b'] }, { id: 'b' }])
      );

      const { groups } = await read();

      expect(groups).toEqual([
        {
          kind: 'data_view',
          documents: [
            {
              source: 'main.data_view.json entry 1',
              spaces: ['team-a', 'team-b'],
              body: { id: 'a' },
            },
            { source: 'main.data_view.json entry 2', body: { id: 'b' } },
          ],
        },
      ]);
    });

    it('names each space once', async () => {
      await write('main.data_view.json', '{"id":"a","spaces":["x","x","y"]}');

      const { groups } = await read();

      expect(groups[0].documents[0].spaces).toEqual(['x', 'y']);
    });

    it('sorts the spaces, so the order a file lists them in does not matter', async () => {
      await write(
        'main.data_view.json',
        JSON.stringify([
          { id: 'a', spaces: ['team-b', 'team-a'] },
          { id: 'b', spaces: ['team-a', 'team-b'] },
        ])
      );

      const { groups } = await read();

      expect(groups[0].documents.map(({ spaces }) => spaces)).toEqual([
        ['team-a', 'team-b'],
        ['team-a', 'team-b'],
      ]);
    });

    it('keeps an empty file as a group of its kind', async () => {
      await write('main.data_view.json', '[]');

      expect((await read()).groups).toEqual([{ kind: 'data_view', documents: [] }]);
    });

    it.each([
      ['an empty array', '[]'],
      ['not an array', '"team-a"'],
      ['an id that is not a string', '[1]'],
      ['an id with characters a space cannot have', '["Team A"]'],
      ['an id that is too long', `["${'a'.repeat(251)}"]`],
      ['too many spaces', JSON.stringify(Array.from({ length: 101 }, (_, i) => `s${i}`))],
    ])('rejects %s, naming the file and the entry', async (_, spaces) => {
      await write('ok.data_view.json', '{"id":"ok"}');
      await write('bad.data_view.json', `[{"id":"a"},{"id":"b","spaces":${spaces}}]`);

      const error = await read().catch((e) => e);

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.problems).toEqual([expect.stringMatching(/^bad\.data_view\.json entry 2: /)]);
    });

    it('cuts a large invalid value it quotes', async () => {
      await write('bad.data_view.json', `[{"id":"a","spaces":[{"big":"${'x'.repeat(10_000)}"}]}]`);

      const error = await read().catch((e) => e);

      expect(error).toBeInstanceOf(BootstrapReadError);
      const [problem] = error.problems;
      expect(problem).toMatch(/not \{"big":"x+…$/);
      expect(problem.length).toBeLessThan(300);
    });
  });

  it('produces the documented hash and changes when any file changes', async () => {
    await write('a.data_view.json', '{"id":"a"}');
    await write('b.data_view.json', '{"id":"b"}');

    const expected = (await import('crypto'))
      .createHash('sha256')
      .update('a.data_view.json\0{"id":"a"}\0b.data_view.json\0{"id":"b"}\0')
      .digest('hex');

    const { hash } = await read();
    expect(hash).toBe(expected);

    await write('b.data_view.json', '{"id":"changed"}');
    expect((await read()).hash).not.toBe(hash);
  });

  describe('the REVISION file', () => {
    it('is not a bootstrap file, and gives the revision', async () => {
      await write('main.data_view.json', '{"id":"a"}');
      await write('REVISION', '42\n');

      const { revision, groups } = await read();

      expect(revision).toBe(42);
      expect(groups).toHaveLength(1);
    });

    it('leaves the revision out, and the hash as it was, when there is no file', async () => {
      await write('main.data_view.json', '{"id":"a"}');
      const withoutFile = await read();

      expect(withoutFile).not.toHaveProperty('revision');
      expect(withoutFile.hash).toBe(
        createHash('sha256').update('main.data_view.json\0{"id":"a"}\0').digest('hex')
      );
    });

    it('changes the hash when the revision changes', async () => {
      await write('main.data_view.json', '{"id":"a"}');
      await write('REVISION', '1');
      const { hash } = await read();

      await write('REVISION', '2');

      expect((await read()).hash).not.toBe(hash);
    });

    it.each([
      ['empty', ''],
      ['negative', '-1'],
      ['fractional', '1.5'],
      ['text', 'v2'],
      ['too long', '1234567890123456'],
      ['over the size limit', `1${' '.repeat(100)}`],
    ])('fails the run when it is %s', async (_name, content) => {
      await write('main.data_view.json', '{"id":"a"}');
      await write('REVISION', content);

      const error = await read().catch((e) => e);

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.problems).toEqual([
        'REVISION: expected a non-negative integer of at most 15 digits',
      ]);
      expect(error.hash).toBeUndefined();
    });

    it('fails the run when it is a directory', async () => {
      await write('REVISION/x', '1');

      await expect(read()).rejects.toThrow('REVISION: directories are not supported');
    });
  });

  it('skips hidden entries and follows symlinks like a mounted volume that swaps its content', async () => {
    await write('..2024_01_01/main.data_view.json', '{"id":"a"}');
    await fs.symlink('..2024_01_01', join(root, '..data'));
    await fs.symlink('..data/main.data_view.json', join(root, 'main.data_view.json'));

    const { groups } = await read();

    expect(groups).toEqual([
      {
        kind: 'data_view',
        documents: [{ source: 'main.data_view.json entry 1', body: { id: 'a' } }],
      },
    ]);
  });

  describe('a mounted volume that swaps its content during a read', () => {
    /** Writes one version of the files into its own hidden directory, as Kubernetes does. */
    const writeVersion = async (version: string, files: Record<string, string>) => {
      for (const [name, content] of Object.entries(files)) {
        await write(`..${version}/${name}`, content);
      }
    };

    /** Points `..data` at a version at once, then links its files and drops the stale links. */
    const swapTo = async (version: string, names: string[]) => {
      await fs.symlink(`..${version}`, join(root, '..data_tmp'));
      await fs.rename(join(root, '..data_tmp'), join(root, '..data'));
      for (const entry of await fs.readdir(root)) {
        if (!entry.startsWith('.') && !names.includes(entry)) {
          await fs.unlink(join(root, entry));
        }
      }
      for (const name of names) {
        await fs.symlink(`..data/${name}`, join(root, name)).catch(() => undefined);
      }
    };

    /** Runs `onOpen` after each open of the named file, once the open has resolved. */
    const afterOpening = (name: string, onOpen: () => Promise<void>) => {
      const { open } = fs;
      return jest.spyOn(fs, 'open').mockImplementation(async (path, flags) => {
        const handle = await open.call(fs, path, flags);
        if (String(path).endsWith(name)) {
          await onOpen();
        }
        return handle;
      });
    };

    const hashOf = (files: Array<[string, string]>) =>
      files
        .reduce(
          (hash, [name, content]) => hash.update(`${name}\0${content}\0`),
          createHash('sha256')
        )
        .digest('hex');

    it('reads again, so the result is the new version and not a mix of both', async () => {
      await writeVersion('2024_01_01', {
        'a.data_view.json': '{"id":"a1"}',
        'b.data_view.json': '{"id":"b1"}',
      });
      await writeVersion('2024_01_02', {
        'a.data_view.json': '{"id":"a2"}',
        'b.data_view.json': '{"id":"b2"}',
      });
      await swapTo('2024_01_01', ['a.data_view.json', 'b.data_view.json']);

      let swapped = false;
      const open = afterOpening('a.data_view.json', async () => {
        if (!swapped) {
          swapped = true;
          await swapTo('2024_01_02', ['a.data_view.json', 'b.data_view.json']);
        }
      });

      try {
        const { hash, groups } = await read();

        expect(groups).toEqual([
          {
            kind: 'data_view',
            documents: [
              { source: 'a.data_view.json entry 1', body: { id: 'a2' } },
              { source: 'b.data_view.json entry 1', body: { id: 'b2' } },
            ],
          },
        ]);
        expect(hash).toBe(
          hashOf([
            ['a.data_view.json', '{"id":"a2"}'],
            ['b.data_view.json', '{"id":"b2"}'],
          ])
        );
        expect(open).toHaveBeenCalledTimes(4);
      } finally {
        open.mockRestore();
      }
    });

    it('reads again when a file the new version removed disappears during a read', async () => {
      await writeVersion('2024_01_01', {
        'a.data_view.json': '{"id":"a1"}',
        'b.data_view.json': '{"id":"b1"}',
      });
      await writeVersion('2024_01_02', { 'a.data_view.json': '{"id":"a2"}' });
      await swapTo('2024_01_01', ['a.data_view.json', 'b.data_view.json']);

      let swapped = false;
      const open = afterOpening('a.data_view.json', async () => {
        if (!swapped) {
          swapped = true;
          await swapTo('2024_01_02', ['a.data_view.json']);
        }
      });

      try {
        const { hash } = await read();

        expect(hash).toBe(hashOf([['a.data_view.json', '{"id":"a2"}']]));
      } finally {
        open.mockRestore();
      }
    });

    it('fails without a hash when the files change during every read', async () => {
      await writeVersion('0', {
        'a.data_view.json': '{"id":"a"}',
        'b.data_view.json': '{"id":"b"}',
      });
      await swapTo('0', ['a.data_view.json', 'b.data_view.json']);

      // Each swap goes to a new directory, as Kubernetes does, so no read sees the same one twice.
      let version = 0;
      const open = afterOpening('a.data_view.json', async () => {
        version++;
        await writeVersion(String(version), {
          'a.data_view.json': `{"id":"a${version}"}`,
          'b.data_view.json': `{"id":"b${version}"}`,
        });
        await swapTo(String(version), ['a.data_view.json', 'b.data_view.json']);
      });

      try {
        const error = await read().catch((e) => e);

        expect(error).toBeInstanceOf(BootstrapReadError);
        expect(error.problems).toEqual([
          'the files changed while they were read, 3 times in a row',
        ]);
        expect(error.hash).toBeUndefined();
      } finally {
        open.mockRestore();
      }
    });
  });

  it('rejects a directory, saying where the spaces go instead', async () => {
    await write('team-a/b.data_view.json', '{"id":"b"}');

    const error = await read().catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(error.problems).toEqual([
      expect.stringMatching(/^team-a: directories are not supported.*"spaces"/),
    ]);
  });

  it('reports every problem at once', async () => {
    await write('notes.txt', 'hello');
    await write('bad.data_view.json', '{not json');
    await write('team/x.data_view.json', '{}');
    await write('list.data_view.json.bak', '[]');
    await write('scalar.dashboard.json', '[1]');

    const error = await read().catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(error.problems).toHaveLength(5);
  });

  it('reports a directory that does not exist as a read error naming the path', async () => {
    const missing = join(root, 'not-mounted');

    const error = await readBootstrapFiles({
      path: missing,
      ...LIMITS,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(error.problems).toEqual([expect.stringContaining(missing)]);
    expect(error.problems[0]).toMatch(/ENOENT/);
  });

  it('reports a dangling symlink as a read error instead of throwing a raw fs error', async () => {
    await fs.symlink('..data/gone.data_view.json', join(root, 'gone.data_view.json'));

    const error: BootstrapReadError = await read().catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(error.problems).toEqual([expect.stringMatching(/^gone\.data_view\.json: .*ENOENT/)]);
  });

  it('reports an unreadable file together with the other problems', async () => {
    await write('locked.data_view.json', '{}');
    await fs.chmod(join(root, 'locked.data_view.json'), 0o000);
    await write('notes.txt', 'hello');

    const error: BootstrapReadError = await read().catch((e) => e);

    expect(error.problems).toHaveLength(2);
  });

  it('says which line of an ndjson file is not valid JSON, counting blank lines', async () => {
    await write('objects.dashboard.ndjson', '{"id":"a"}\n\n{"id":\n');

    const error: BootstrapReadError = await read().catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(error.problems).toEqual([
      expect.stringMatching(/^objects\.dashboard\.ndjson: line 3: /),
    ]);
  });

  it('rejects files over the size limit', async () => {
    await write('big.data_view.json', '{"id":"aaaaaaaaaaaaaaaaaaaa"}');

    await expect(
      readBootstrapFiles({ path: root, ...LIMITS, maxFileSizeBytes: 5 })
    ).rejects.toThrow(/exceeds the 5 byte limit/);
  });

  describe('limits on the whole source', () => {
    it('rejects more files than the limit, without reading any of them', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('b.data_view.json', '{"id":"b"}');
      // Not valid JSON: it would be reported if the content were read.
      await write('c.data_view.json', '{not json');

      const error = await readBootstrapFiles({ path: root, ...LIMITS, maxFiles: 2 }).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.problems).toEqual(['3 entries exceed the limit of 2']);
    });

    it('counts misnamed entries against the limit, before looking at any of them', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('stray-1.txt', '');
      await write('stray-2.txt', '');
      const stat = jest.spyOn(fs, 'stat');

      const error = await readBootstrapFiles({ path: root, ...LIMITS, maxFiles: 2 }).catch(
        (e) => e
      );

      expect(error.problems).toEqual(['3 entries exceed the limit of 2']);
      expect(stat).not.toHaveBeenCalled();
      stat.mockRestore();
    });

    it('reports at most the limit of problems, counting the ones it leaves out', async () => {
      const strays = MAX_REPORTED_ERRORS + 20;
      for (let i = 0; i < strays; i++) {
        await write(`stray-${String(i).padStart(3, '0')}.txt`, '');
      }

      const error = await readBootstrapFiles({ path: root, ...LIMITS, maxFiles: 1000 }).catch(
        (e) => e
      );

      expect(error.problems).toHaveLength(MAX_REPORTED_ERRORS);
      expect(error.problems[MAX_REPORTED_ERRORS - 1]).toBe('and 21 more problems');
      expect(error.message.split('; ')).toHaveLength(MAX_REPORTED_ERRORS);
    });

    it('accepts exactly as many files as the limit', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('b.data_view.json', '{"id":"b"}');

      await expect(readBootstrapFiles({ path: root, ...LIMITS, maxFiles: 2 })).resolves.toEqual(
        expect.objectContaining({ hash: expect.any(String) })
      );
    });

    it('rejects files that add up to more than the total limit, though each is small enough', async () => {
      await write('a.data_view.json', '{"id":"a","title":"aaaaaaaaaa"}');
      await write('b.data_view.json', '{"id":"b","title":"bbbbbbbbbb"}');
      // Not valid JSON: it would be reported if the content were read.
      await write('c.data_view.json', '{not json');

      const error = await readBootstrapFiles({
        path: root,
        ...LIMITS,
        maxFileSizeBytes: 100,
        maxTotalSizeBytes: 50,
      }).catch((e) => e);

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.problems).toEqual([
        expect.stringMatching(/^3 files total \d+ bytes, which exceeds the 50 byte limit$/),
      ]);
    });

    /** Grows each named file on disk right before it is first opened, after it was listed. */
    const growBeforeRead = (names: string[], content: string) => {
      const { open } = fs;
      const grown = new Set<string>();
      return jest.spyOn(fs, 'open').mockImplementation(async (path, flags) => {
        const name = names.find((candidate) => String(path).endsWith(candidate));
        if (name && !grown.has(name)) {
          grown.add(name);
          await fs.writeFile(String(path), content);
        }
        return open.call(fs, path, flags);
      });
    };

    it('reads again a file that grew after it was listed, and rejects it without reading all of it', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('b.data_view.json', '{"id":"b"}');

      const open = growBeforeRead(['b.data_view.json'], `{"id":"${'x'.repeat(100)}"}`);

      try {
        const error = await readBootstrapFiles({
          path: root,
          ...LIMITS,
          maxFileSizeBytes: 50,
          maxTotalSizeBytes: 200,
        }).catch((e) => e);

        expect(error).toBeInstanceOf(BootstrapReadError);
        expect(error.problems).toEqual(['b.data_view.json: 109 bytes exceeds the 50 byte limit']);
        expect(error.hash).toBeUndefined();
        // Only the first read opened files; the second rejected the size before opening any.
        expect(open).toHaveBeenCalledTimes(2);
      } finally {
        open.mockRestore();
      }
    });

    it('rejects files that grew past the total limit after they were listed', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('b.data_view.json', '{"id":"b"}');

      const open = growBeforeRead(
        ['a.data_view.json', 'b.data_view.json'],
        `{"id":"${'x'.repeat(30)}"}`
      );

      try {
        const error = await readBootstrapFiles({
          path: root,
          ...LIMITS,
          maxFileSizeBytes: 100,
          maxTotalSizeBytes: 50,
        }).catch((e) => e);

        expect(error.problems).toEqual([
          expect.stringMatching(/^2 files total \d+ bytes, which exceeds the 50 byte limit$/),
        ]);
      } finally {
        open.mockRestore();
      }
    });

    it('stops reading as soon as a file that grew after it was listed exceeds the total limit', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('b.data_view.json', '{"id":"b"}');
      await write('c.data_view.json', '{"id":"c"}');

      const open = growBeforeRead(['a.data_view.json'], `{"id":"${'x'.repeat(60)}"}`);

      try {
        const error = await readBootstrapFiles({
          path: root,
          ...LIMITS,
          maxFileSizeBytes: 100,
          maxTotalSizeBytes: 50,
        }).catch((e) => e);

        expect(error).toBeInstanceOf(BootstrapReadError);
        expect(error.problems).toEqual([
          expect.stringMatching(/^3 files total \d+ bytes, which exceeds the 50 byte limit$/),
        ]);
        // The first read stopped at the grown file; the second rejected the total before opening any.
        expect(open).toHaveBeenCalledTimes(1);
      } finally {
        open.mockRestore();
      }
    });

    it('accepts a total exactly at the limit', async () => {
      const content = '{"id":"a"}';
      await write('a.data_view.json', content);
      await write('b.data_view.json', content);

      await expect(
        readBootstrapFiles({
          path: root,
          ...LIMITS,
          maxTotalSizeBytes: Buffer.byteLength(content) * 2,
        })
      ).resolves.toEqual(expect.objectContaining({ hash: expect.any(String) }));
    });

    it('reports both an oversized file and the total together', async () => {
      await write('a.data_view.json', '{"id":"aaaaaaaaaaaaaaaaaaaa"}');
      await write('b.data_view.json', '{"id":"bbbbbbbbbbbbbbbbbbbb"}');

      const error = await readBootstrapFiles({
        path: root,
        ...LIMITS,
        maxFileSizeBytes: 10,
        maxTotalSizeBytes: 20,
      }).catch((e) => e);

      expect(error.problems).toHaveLength(3);
    });
  });

  describe('the hash of files that fail to read', () => {
    it('is the hash of the files when only their content is invalid', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      const { hash } = await read();
      await write('bad.data_view.json', '{not json');
      await write('scalar.dashboard.json', '[1]');

      const error = await read().catch((e) => e);

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(error.hash).not.toBe(hash);
    });

    it('follows the documented framing', async () => {
      await write('bad.data_view.json', '{not json');

      const error = await read().catch((e) => e);

      expect(error.hash).toBe(
        createHash('sha256').update('bad.data_view.json\0{not json\0').digest('hex')
      );
    });

    it('is absent when a file does not match the naming rule', async () => {
      await write('a.data_view.json', '{"id":"a"}');
      await write('notes.txt', 'hello');

      const error = await read().catch((e) => e);

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.hash).toBeUndefined();
    });

    it('is absent when the directory does not exist', async () => {
      const error = await readBootstrapFiles({ path: join(root, 'missing'), ...LIMITS }).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(BootstrapReadError);
      expect(error.hash).toBeUndefined();
    });
  });
});

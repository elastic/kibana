/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { PassThrough } from 'stream';

import archiver from 'archiver';
import * as tar from 'tar';

import type { AssetParts } from '../../../types';

import { getBufferExtractor, getPathParts, untarBuffer, unzipBuffer } from '.';

function createZipBuffer(files: Array<{ name: string; content: string }>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip');
    const chunks: Buffer[] = [];
    archive.on('data', (c: Buffer) => chunks.push(c));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    for (const { name, content } of files) {
      archive.append(content, { name });
    }
    void archive.finalize();
  });
}

async function createTarGzBuffer(
  files: Array<{ relativePath: string; content: string }>
): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-test-tar-'));
  try {
    for (const { relativePath, content } of files) {
      const fullPath = path.join(tmpDir, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    const topDir = files[0].relativePath.split('/')[0];
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const out = new PassThrough();
      out.on('data', (c: Buffer) => chunks.push(c));
      out.on('end', resolve);
      out.on('error', reject);
      tar.create({ gzip: true, cwd: tmpDir, portable: true }, [topDir]).pipe(out);
    });
    return Buffer.concat(chunks);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
}

describe('getPathParts', () => {
  const testPaths = [
    {
      path: 'foo-1.1.0/service/type/file.yml',
      assetParts: {
        dataset: undefined,
        file: 'file.yml',
        path: 'foo-1.1.0/service/type/file.yml',
        pkgkey: 'foo-1.1.0',
        service: 'service',
        type: 'type',
      },
    },
    {
      path: 'iptables-1.0.4/kibana/visualization/683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
      assetParts: {
        dataset: undefined,
        file: '683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
        path: 'iptables-1.0.4/kibana/visualization/683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
        pkgkey: 'iptables-1.0.4',
        service: 'kibana',
        type: 'visualization',
      },
    },
    {
      path: 'coredns-1.0.1/data_stream/stats/fields/coredns.stats.yml',
      assetParts: {
        dataset: 'stats',
        file: 'coredns.stats.yml',
        path: 'coredns-1.0.1/data_stream/stats/fields/coredns.stats.yml',
        pkgkey: 'coredns-1.0.1',
        service: '',
        type: 'fields',
      },
    },
  ];
  test('testPathParts', () => {
    for (const value of testPaths) {
      expect(getPathParts(value.path)).toStrictEqual(value.assetParts as AssetParts);
    }
  });
});

describe('getBufferExtractor called with { archivePath }', () => {
  it('returns unzipBuffer if `archivePath` ends in .zip', () => {
    const extractor = getBufferExtractor({ archivePath: '.zip' });
    expect(extractor).toBe(unzipBuffer);
  });

  it('returns untarBuffer if `archivePath` ends in .gz', () => {
    const extractor = getBufferExtractor({ archivePath: '.gz' });
    expect(extractor).toBe(untarBuffer);
    const extractor2 = getBufferExtractor({ archivePath: '.tar.gz' });
    expect(extractor2).toBe(untarBuffer);
  });

  it('returns `undefined` if `archivePath` ends in anything else', () => {
    const extractor = getBufferExtractor({ archivePath: '.xyz' });
    expect(extractor).toEqual(undefined);
  });
});

describe('getBufferExtractor called with { contentType }', () => {
  it('returns unzipBuffer if `contentType` is `application/zip`', () => {
    const extractor = getBufferExtractor({ contentType: 'application/zip' });
    expect(extractor).toBe(unzipBuffer);
  });

  it('returns untarBuffer if `contentType` is `application/gzip`', () => {
    const extractor = getBufferExtractor({ contentType: 'application/gzip' });
    expect(extractor).toBe(untarBuffer);
  });

  it('returns `undefined` if `contentType` ends in anything else', () => {
    const extractor = getBufferExtractor({ contentType: '.xyz' });
    expect(extractor).toEqual(undefined);
  });
});

describe('untarBuffer', () => {
  let tarGzBuffer: Buffer;

  beforeAll(async () => {
    tarGzBuffer = await createTarGzBuffer([
      { relativePath: 'pkg-1.0.0/file.json', content: '{"test":true}' },
    ]);
  });

  it('awaits onEntry promises before resolving', async () => {
    let callbackSettled = false;
    await untarBuffer(tarGzBuffer, undefined, async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      callbackSettled = true;
    });
    expect(callbackSettled).toBe(true);
  });

  it('propagates onEntry errors without wrapping them', async () => {
    const originalError = new Error('callback error');
    // traverseArchiveEntries wraps errors as PackageInvalidArchiveError; untarBuffer
    // itself should propagate the raw error so callers can inspect its type.
    await expect(
      untarBuffer(tarGzBuffer, undefined, async () => {
        throw originalError;
      })
    ).rejects.toBe(originalError);
  });
});

describe('unzipBuffer', () => {
  let zipBuffer: Buffer;

  beforeAll(async () => {
    zipBuffer = await createZipBuffer([{ name: 'pkg-1.0.0/file.json', content: '{"test":true}' }]);
  });

  it('awaits onEntry promises before resolving', async () => {
    let callbackSettled = false;
    await unzipBuffer(zipBuffer, undefined, async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      callbackSettled = true;
    });
    expect(callbackSettled).toBe(true);
  });

  it('propagates onEntry errors without wrapping them', async () => {
    const originalError = new Error('callback error');
    await expect(
      unzipBuffer(zipBuffer, undefined, async () => {
        throw originalError;
      })
    ).rejects.toBe(originalError);
  });
});

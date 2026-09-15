/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finished } from 'stream/promises';

import * as tar from 'tar';
import yauzl from 'yauzl';

import { bufferToStream, streamToBuffer } from '../streams';
import type { ArchiveEntry } from '../../../../common/types';

export async function untarBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = async (entry: ArchiveEntry): Promise<void> => {},
  shouldReadBuffer?: (path: string) => boolean
) {
  const deflatedStream = bufferToStream(buffer);
  const entryPromises: Array<Promise<void>> = [];

  // use tar.list vs .extract to avoid writing to disk
  const inflateStream = tar.list().on('entry', (entry) => {
    const path = entry.path || '';
    if (!filter({ path })) return;

    if (shouldReadBuffer && !shouldReadBuffer(path)) {
      entryPromises.push(onEntry({ path }));
      return;
    }

    // streamToBuffer must be called synchronously here to consume the entry stream
    // before tar advances to the next entry; the resulting promise is awaited below.
    entryPromises.push(
      streamToBuffer(entry as unknown as NodeJS.ReadableStream).then((entryBuffer) =>
        onEntry({ buffer: entryBuffer, path })
      )
    );
  });

  deflatedStream.pipe(inflateStream);

  await finished(inflateStream);
  await Promise.all(entryPromises);
}

export async function unzipBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = async (entry: ArchiveEntry): Promise<void> => {},
  shouldReadBuffer?: (path: string) => boolean
): Promise<void> {
  const zipfile = await yauzlFromBuffer(buffer, { lazyEntries: true });
  zipfile.readEntry();
  return new Promise((resolve, reject) => {
    zipfile.on('entry', async (entry: yauzl.Entry) => {
      const path = entry.fileName;
      if (!filter({ path })) {
        zipfile.readEntry();
        return;
      }

      try {
        if (shouldReadBuffer && !shouldReadBuffer(path)) {
          await onEntry({ path });
        } else {
          const entryBuffer = await getZipReadStream(zipfile, entry).then(streamToBuffer);
          await onEntry({ buffer: entryBuffer, path });
        }
        zipfile.readEntry();
      } catch (err) {
        reject(err);
      }
    });
    zipfile.on('end', resolve);
    zipfile.on('error', reject);
  });
}

type BufferExtractor = typeof unzipBuffer | typeof untarBuffer;
export function getBufferExtractor(
  args: { contentType: string } | { archivePath: string }
): BufferExtractor | undefined {
  if ('contentType' in args) {
    if (args.contentType === 'application/gzip') {
      return untarBuffer;
    } else if (args.contentType === 'application/zip') {
      return unzipBuffer;
    }
  } else if ('archivePath' in args) {
    if (args.archivePath.endsWith('.zip')) {
      return unzipBuffer;
    }
    if (args.archivePath.endsWith('.gz')) {
      return untarBuffer;
    }
  }
}

function yauzlFromBuffer(buffer: Buffer, opts: yauzl.Options): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, opts, (err: Error | null, handle?: yauzl.ZipFile) =>
      err ? reject(err) : resolve(handle!)
    )
  );
}

function getZipReadStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) =>
    zipfile.openReadStream(entry, (err: Error | null, readStream?: NodeJS.ReadableStream) =>
      err ? reject(err) : resolve(readStream!)
    )
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import yauzl from 'yauzl';

export interface ZipArchive {
  hasEntry(entryPath: string): boolean;
  getEntryPaths(): string[];
  getEntryContent(entryPath: string): Promise<Buffer>;
  getEntryStream(entryPath: string): Promise<Readable>;
  close(): void;
}

export const openZipArchive = async (archivePath: string): Promise<ZipArchive> => {
  return new Promise<ZipArchive>((resolve, reject) => {
    const entries: yauzl.Entry[] = [];
    yauzl.open(archivePath, { lazyEntries: true, autoClose: false }, (err, zipFile) => {
      if (err || !zipFile) {
        return reject(err ?? 'No zip file');
      }

      zipFile!.on('entry', (entry) => {
        entries.push(entry);
        zipFile.readEntry();
      });

      zipFile.on('end', () => {
        const archive = new ZipArchiveImpl(entries, zipFile);
        resolve(archive);
      });

      zipFile.on('close', () => {});

      zipFile.readEntry();
    });
  });
};

class ZipArchiveImpl implements ZipArchive {
  private readonly zipFile: yauzl.ZipFile;
  private readonly entries: Map<string, yauzl.Entry>;

  constructor(entries: yauzl.Entry[], zipFile: yauzl.ZipFile) {
    this.zipFile = zipFile;
    this.entries = new Map(entries.map((entry) => [entry.fileName, entry]));
  }

  hasEntry(entryPath: string) {
    return this.entries.has(entryPath);
  }

  getEntryPaths() {
    return [...this.entries.keys()];
  }

  getEntryContent(entryPath: string) {
    return getZipEntryContent(this.zipFile, this.getEntry(entryPath));
  }

  getEntryStream(entryPath: string) {
    return openZipEntryStream(this.zipFile, this.getEntry(entryPath));
  }

  private getEntry(entryPath: string): yauzl.Entry {
    const foundEntry = this.entries.get(entryPath);
    if (!foundEntry) {
      throw new Error(`Entry ${entryPath} not found in archive`);
    }
    return foundEntry;
  }

  close() {
    this.zipFile.close();
  }
}

const openZipEntryStream = (zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> => {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (err, readStream) => {
      if (err || !readStream) {
        return reject(err ?? new Error(`Could not open read stream for entry ${entry.fileName}`));
      }
      resolve(readStream);
    });
  });
};

const getZipEntryContent = async (zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> => {
  const readStream = await openZipEntryStream(zipFile, entry);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    readStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readStream.on('error', (streamError) => {
      reject(streamError);
    });
  });
};

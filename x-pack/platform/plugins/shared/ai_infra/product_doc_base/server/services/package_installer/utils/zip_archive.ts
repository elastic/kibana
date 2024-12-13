/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yauzl from 'yauzl';

export interface ZipArchive {
  hasEntry(entryPath: string): boolean;
  getEntryPaths(): string[];
  getEntryContent(entryPath: string): Promise<Buffer>;
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
    const foundEntry = this.entries.get(entryPath);
    if (!foundEntry) {
      throw new Error(`Entry ${entryPath} not found in archive`);
    }
    return getZipEntryContent(this.zipFile, foundEntry);
  }

  close() {
    this.zipFile.close();
  }
}

const getZipEntryContent = async (zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (err, readStream) => {
      if (err) {
        return reject(err);
      } else {
        const chunks: Buffer[] = [];
        readStream!.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        readStream!.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        readStream!.on('error', () => {
          reject();
        });
      }
    });
  });
};

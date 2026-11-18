/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, type Hash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { JsonValue } from '@kbn/resource-bootstrap-server';
import { MAX_REPORTED_ERRORS } from '../../common';
import type { ResourceBootstrapConfig } from '../config';
import type { DeclaredDocument } from '../registry/resource_kind_registry';
import { toMessage } from '../to_message';

/** `<name>.<kind>.<json|ndjson>`, for example `main.data_view.json`. */
const FILE_NAME_PATTERN = /^[A-Za-z0-9_-]+\.([a-z][a-z0-9_]*)\.(json|ndjson)$/;
/** Optional file holding a non-negative integer that orders sets of files; see the README. */
export const REVISION_FILE_NAME = 'REVISION';
const REVISION_PATTERN = /^[0-9]{1,15}$/;
const MAX_REVISION_FILE_BYTES = 64;
const SPACE_ID_PATTERN = /^[a-z0-9_-]+$/;
const MAX_SPACE_ID_LENGTH = 250;
const MAX_SPACES_PER_DOCUMENT = 100;
const MAX_QUOTED_VALUE_LENGTH = 100;

/** The document field naming its spaces; removed before the kind sees it. */
export const SPACES_FIELD = 'spaces';

export interface BootstrapDocument extends DeclaredDocument {
  /** `undefined` when the document named no spaces; never empty, sorted and without repeats. */
  spaces?: string[];
}

/** Every document of one kind; present even when its files are empty. */
export interface BootstrapGroup {
  kind: string;
  documents: BootstrapDocument[];
}

export interface BootstrapInput {
  /** SHA-256 hex of `<path> NUL <content> NUL` for each non-hidden file, ordered by path. */
  hash: string;
  /** The number in the `REVISION` file; `undefined` when there is none. */
  revision?: number;
  groups: BootstrapGroup[];
}

/** Keeps the first problems and counts the rest, so a directory full of stray files stays brief. */
const capProblems = (problems: string[]): string[] =>
  problems.length > MAX_REPORTED_ERRORS
    ? [
        ...problems.slice(0, MAX_REPORTED_ERRORS - 1),
        `and ${problems.length - MAX_REPORTED_ERRORS + 1} more problems`,
      ]
    : problems;

export class BootstrapReadError extends Error {
  /** At most `MAX_REPORTED_ERRORS`, the last one counting those left out. */
  public readonly problems: string[];

  constructor(
    problems: string[],
    /** Set when every file was read, so only their content is invalid. */
    public readonly hash?: string
  ) {
    const capped = capProblems(problems);
    super(`Could not read the bootstrap files: ${capped.join('; ')}`);
    this.problems = capped;
  }
}

interface FoundFile {
  relativePath: string;
  absolutePath: string;
  kind: string;
  format: 'json' | 'ndjson';
}

// Mounted volumes use hidden entries and symlinks: skip hidden entries and let `stat` follow links.
const isHidden = (name: string): boolean => name.startsWith('.');

const isJsonObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Cut, so a large value cannot bloat the problems, the logs and the status.
const quoteValue = (value: JsonValue): string => {
  const quoted = JSON.stringify(value);
  return quoted.length > MAX_QUOTED_VALUE_LENGTH
    ? `${quoted.slice(0, MAX_QUOTED_VALUE_LENGTH)}…`
    : quoted;
};

/** Lists the entries; more than `maxFiles` fails before any is looked at, misnamed ones included. */
const listFiles = async (
  root: string,
  maxFiles: number
): Promise<{ files: FoundFile[]; problems: string[]; revisionPath?: string }> => {
  const files: FoundFile[] = [];
  const problems: string[] = [];
  let revisionPath: string | undefined;

  const entries = (await fs.readdir(root)).filter((name) => !isHidden(name)).sort();
  if (entries.length > maxFiles) {
    throw new BootstrapReadError([`${entries.length} entries exceed the limit of ${maxFiles}`]);
  }

  for (const entry of entries) {
    const entryPath = join(root, entry);
    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(entryPath);
    } catch (error) {
      problems.push(`${entry}: ${toMessage(error)}`);
      continue;
    }

    if (stats.isDirectory()) {
      problems.push(
        `${entry}: directories are not supported; name the spaces in the "${SPACES_FIELD}" field of each document`
      );
      continue;
    }
    if (!stats.isFile()) {
      problems.push(`${entry}: expected a file`);
      continue;
    }

    if (entry === REVISION_FILE_NAME) {
      revisionPath = entryPath;
      continue;
    }

    const match = FILE_NAME_PATTERN.exec(entry);
    if (!match) {
      problems.push(`${entry}: expected a file named <name>.<kind>.<json|ndjson>`);
      continue;
    }
    const [, kind, format] = match;
    files.push({
      relativePath: entry,
      absolutePath: entryPath,
      kind,
      format: format === 'json' ? 'json' : 'ndjson',
    });
  }

  return { files, problems, revisionPath };
};

const parseDocuments = (content: string, format: 'json' | 'ndjson'): JsonValue[] => {
  if (format === 'ndjson') {
    return content.split('\n').flatMap((line, index) => {
      if (line.trim().length === 0) {
        return [];
      }
      try {
        return [JSON.parse(line)];
      } catch (error) {
        throw new Error(`line ${index + 1}: ${toMessage(error)}`);
      }
    });
  }
  const parsed: JsonValue = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [parsed];
};

/** Splits the `spaces` field off a document, or returns why it is invalid. */
const toBootstrapDocument = (
  document: { [key: string]: JsonValue },
  source: string
): BootstrapDocument | string => {
  const { [SPACES_FIELD]: spaces, ...body } = document;
  if (spaces === undefined) {
    return { source, body };
  }
  if (!Array.isArray(spaces) || spaces.length === 0) {
    return `"${SPACES_FIELD}" must be a non-empty array of space ids`;
  }
  if (spaces.length > MAX_SPACES_PER_DOCUMENT) {
    return `"${SPACES_FIELD}" names ${spaces.length} spaces; the most is ${MAX_SPACES_PER_DOCUMENT}`;
  }
  const spaceIds: string[] = [];
  for (const space of spaces) {
    if (
      typeof space !== 'string' ||
      space.length > MAX_SPACE_ID_LENGTH ||
      !SPACE_ID_PATTERN.test(space)
    ) {
      return `"${SPACES_FIELD}" must only hold space ids that use a-z, 0-9, "_" and "-", not ${quoteValue(
        space
      )}`;
    }
    spaceIds.push(space);
  }
  // Sorted, so the order a file lists them in neither splits a declaration nor rewrites it.
  return { source, spaces: [...new Set(spaceIds)].sort(), body };
};

export interface ReadLimits {
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  maxFiles: number;
}

export const getReadLimits = ({
  maxFileSize,
  maxTotalSize,
  maxFiles,
}: Pick<ResourceBootstrapConfig, 'maxFileSize' | 'maxTotalSize' | 'maxFiles'>): ReadLimits => ({
  maxFileSizeBytes: maxFileSize.getValueInBytes(),
  maxTotalSizeBytes: maxTotalSize.getValueInBytes(),
  maxFiles,
});

const addToHash = (hash: Hash, { relativePath }: FoundFile, content: Buffer): void => {
  hash.update(relativePath).update('\0').update(content).update('\0');
};

const READ_CHUNK_BYTES = 64 * 1024;

/** Reads at most `limit + 1` bytes, so a file over the limit is detected without loading all of it. */
const readAtMost = async (path: string, limit: number): Promise<Buffer> => {
  const handle = await fs.open(path, 'r');
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    while (size <= limit) {
      const chunk = Buffer.alloc(Math.min(READ_CHUNK_BYTES, limit + 1 - size));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) {
        break;
      }
      chunks.push(chunk.subarray(0, bytesRead));
      size += bytesRead;
    }
    return Buffer.concat(chunks, size);
  } finally {
    await handle.close();
  }
};

// Rechecks the size limits on read, since a file may have grown after it was listed. Each read is
// bounded by what is left of the total, so a change after listing cannot load more than the total.
const createLimitedReader = ({
  maxFileSizeBytes,
  maxTotalSizeBytes,
}: Pick<ReadLimits, 'maxFileSizeBytes' | 'maxTotalSizeBytes'>) => {
  let totalSize = 0;
  return {
    read: async ({ absolutePath }: FoundFile): Promise<Buffer> => {
      const remaining = maxTotalSizeBytes - totalSize;
      const content = await readAtMost(absolutePath, Math.min(maxFileSizeBytes, remaining));
      if (content.length > remaining) {
        // Stops the whole read, so nothing more is held.
        throw new BootstrapReadError([
          `the files grew past the ${maxTotalSizeBytes} byte total limit after they were listed`,
        ]);
      }
      if (content.length > maxFileSizeBytes) {
        throw new Error(
          `grew past the ${maxFileSizeBytes} byte limit after it was listed, so it was not read`
        );
      }
      totalSize += content.length;
      return content;
    },
  };
};

/** Lists the files and enforces the limits before any content is read. */
const collectFiles = async ({
  path,
  maxFileSizeBytes,
  maxTotalSizeBytes,
  maxFiles,
}: { path: string } & ReadLimits): Promise<{
  files: FoundFile[];
  problems: string[];
  revisionPath?: string;
}> => {
  let listing: Awaited<ReturnType<typeof listFiles>>;
  try {
    listing = await listFiles(path, maxFiles);
  } catch (error) {
    if (error instanceof BootstrapReadError) {
      throw error;
    }
    throw new BootstrapReadError([`${path}: ${toMessage(error)}`]);
  }

  const { files, problems, revisionPath } = listing;

  const sizeProblems: string[] = [];
  const readable: FoundFile[] = [];
  let totalSize = 0;
  for (const file of files) {
    try {
      const { size } = await fs.stat(file.absolutePath);
      totalSize += size;
      if (size > maxFileSizeBytes) {
        sizeProblems.push(
          `${file.relativePath}: ${size} bytes exceeds the ${maxFileSizeBytes} byte limit`
        );
      }
      readable.push(file);
    } catch (error) {
      problems.push(`${file.relativePath}: ${toMessage(error)}`);
    }
  }
  if (totalSize > maxTotalSizeBytes) {
    sizeProblems.push(
      `${files.length} files total ${totalSize} bytes, which exceeds the ${maxTotalSizeBytes} byte limit`
    );
  }
  if (sizeProblems.length > 0) {
    throw new BootstrapReadError([...problems, ...sizeProblems]);
  }

  return { files: readable, problems, revisionPath };
};

const MAX_READ_ATTEMPTS = 3;

/**
 * Where each entry leads and what is there, so a read that overlaps a change can be detected. A
 * mounted volume swaps its hidden `..data` link at once, which changes the real path of every file.
 */
const fingerprintFiles = async (root: string, maxFiles: number): Promise<string> => {
  let entries: string[];
  try {
    entries = (await fs.readdir(root)).filter((name) => !isHidden(name)).sort();
  } catch (error) {
    return `unreadable: ${toMessage(error)}`;
  }
  // The read rejects these before looking at any entry, so this does not look either.
  if (entries.length > maxFiles) {
    return entries.join('\0');
  }

  const parts = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(root, entry);
      try {
        const [target, { ino, size, mtimeMs }] = await Promise.all([
          fs.realpath(entryPath),
          fs.stat(entryPath),
        ]);
        return [entry, target, ino, size, mtimeMs].join('\0');
      } catch (error) {
        return `${entry}\0${toMessage(error)}`;
      }
    })
  );
  return parts.join('\n');
};

/** Reads the `REVISION` file, or returns why it is invalid. */
const readRevision = async (
  path: string
): Promise<{ revision: number; content: Buffer } | string> => {
  try {
    const content = await readAtMost(path, MAX_REVISION_FILE_BYTES);
    const text = content.toString('utf8').trim();
    if (content.length > MAX_REVISION_FILE_BYTES || !REVISION_PATTERN.test(text)) {
      return `${REVISION_FILE_NAME}: expected a non-negative integer of at most 15 digits`;
    }
    return { revision: Number(text), content };
  } catch (error) {
    return `${REVISION_FILE_NAME}: ${toMessage(error)}`;
  }
};

const readOnce = async (params: { path: string } & ReadLimits): Promise<BootstrapInput> => {
  const { files, problems, revisionPath } = await collectFiles(params);
  const hash = createHash('sha256');
  const groups = new Map<string, BootstrapGroup>();
  const reader = createLimitedReader(params);
  let hashedEveryFile = problems.length === 0;

  for (const file of files) {
    let content: Buffer;
    try {
      content = await reader.read(file);
    } catch (error) {
      if (error instanceof BootstrapReadError) {
        throw error;
      }
      problems.push(`${file.relativePath}: ${toMessage(error)}`);
      hashedEveryFile = false;
      continue;
    }
    addToHash(hash, file, content);

    try {
      const documents: BootstrapDocument[] = [];
      parseDocuments(content.toString('utf8'), file.format).forEach((document, index) => {
        const source = `${file.relativePath} entry ${index + 1}`;
        if (!isJsonObject(document)) {
          problems.push(`${source} is not a JSON object`);
          return;
        }
        const converted = toBootstrapDocument(document, source);
        if (typeof converted === 'string') {
          problems.push(`${source}: ${converted}`);
          return;
        }
        documents.push(converted);
      });

      const group = groups.get(file.kind) ?? { kind: file.kind, documents: [] };
      for (const document of documents) {
        group.documents.push(document);
      }
      groups.set(file.kind, group);
    } catch (error) {
      problems.push(`${file.relativePath}: ${toMessage(error)}`);
    }
  }

  // After the other files, so files without a `REVISION` keep the hash they always had.
  let revision: number | undefined;
  if (revisionPath !== undefined) {
    const read = await readRevision(revisionPath);
    if (typeof read === 'string') {
      problems.push(read);
      hashedEveryFile = false;
    } else {
      revision = read.revision;
      hash.update(REVISION_FILE_NAME).update('\0').update(read.content).update('\0');
    }
  }

  const digest = hash.digest('hex');
  if (problems.length > 0) {
    throw new BootstrapReadError(problems, hashedEveryFile ? digest : undefined);
  }

  return {
    hash: digest,
    ...(revision !== undefined && { revision }),
    groups: [...groups.values()].sort((a, b) => a.kind.localeCompare(b.kind)),
  };
};

/**
 * Reads, hashes and parses the bootstrap files within the configured limits, reading again when
 * they change during a read, so the result is always one version of them.
 */
export const readBootstrapFiles = async (
  params: { path: string } & ReadLimits
): Promise<BootstrapInput> => {
  const { path, maxFiles } = params;
  for (let attempt = 0; attempt < MAX_READ_ATTEMPTS; attempt++) {
    const before = await fingerprintFiles(path, maxFiles);
    const read = readOnce(params);
    // Settle it before looking again; when nothing changed, a failure is returned as it is.
    await read.catch(() => undefined);
    if ((await fingerprintFiles(path, maxFiles)) === before) {
      return read;
    }
  }
  throw new BootstrapReadError([
    `the files changed while they were read, ${MAX_READ_ATTEMPTS} times in a row`,
  ]);
};

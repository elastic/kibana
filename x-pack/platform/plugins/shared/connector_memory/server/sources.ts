/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorSpec, type ContentEntry } from '@kbn/connector-specs';

/**
 * A connector memory can read is one whose spec declares `contentSource` and so implements the `contextList`,
 * `contextGetMetadata` and `contextGetContent` actions. This file knows no connector by name: a source lists folders, looks one file
 * up, reads its text and says whether the caller can open it, all as the user the connector call runs as. A file is
 * identified by the connector's own entry id.
 */

export type SourceFile = ContentEntry;

export type Access = { decision: 'allowed' | 'denied' } | { decision: 'unknown'; reason: string };

export interface Source {
  list: (params: {
    folder: string;
    maxDepth: number;
    maxFiles: number;
  }) => Promise<{ files: SourceFile[]; truncated: boolean }>;
  stat: (id: string) => Promise<SourceFile>;
  /** The file's text, or undefined when it is not text or too large to read. */
  readText: (file: SourceFile) => Promise<string | undefined>;
  canOpen: (id: string) => Promise<Access>;
}

/** Runs one connector sub-action as the calling user; throws the connector's own message on failure. */
export type Execute = (subAction: string, params: Record<string, unknown>) => Promise<unknown>;

const MAX_REASON_CHARS = 160;
// What connectors say when the caller may not see a file, or it is gone; anything else is "unknown".
const REFUSAL = /\b(403|404)\b|AccessDenied|Forbidden|not found/i;

/** The connector type's content source marker, when it has one. */
export const contentSourceOf = (connectorType: string) =>
  getConnectorSpec(connectorType)?.contentSource;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toEntry = (value: unknown): SourceFile | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return undefined;
  }
  return value as unknown as SourceFile;
};

export const createSource = (execute: Execute, maxDownloadBytes: number): Source => ({
  // A breadth-first walk: the folder's own entries first, then each level below it. A flat source reports `depth`.
  list: async ({ folder, maxDepth, maxFiles }) => {
    const files: SourceFile[] = [];
    const queue = [{ folder, depth: 0 }];
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      let pageToken: string | undefined;
      do {
        const data = await execute('contextList', {
          folder: next.folder,
          ...(pageToken !== undefined && { pageToken }),
        });
        const entries = isRecord(data) && Array.isArray(data.entries) ? data.entries : [];
        for (const entry of entries.map(toEntry)) {
          if (entry === undefined) {
            continue;
          }
          if (entry.isFolder) {
            if (next.depth < maxDepth) {
              queue.push({ folder: entry.id, depth: next.depth + 1 });
            }
          } else if (next.depth + (entry.depth ?? 0) > maxDepth) {
            continue;
          } else if (files.length >= maxFiles) {
            return { files, truncated: true };
          } else {
            files.push(entry);
          }
        }
        pageToken =
          isRecord(data) && typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
      } while (pageToken !== undefined);
    }
    return { files, truncated: false };
  },

  stat: async (id) => {
    const entry = toEntry(await execute('contextGetMetadata', { id }));
    if (entry === undefined) {
      throw new Error(`File '${id}' was not found.`);
    }
    return entry;
  },

  readText: async ({ id }) => {
    const data = await execute('contextGetContent', { id, maxBytes: maxDownloadBytes });
    return isRecord(data) && typeof data.text === 'string' ? data.text : undefined;
  },

  // A refusal is "denied"; anything else it cannot tell is "unknown".
  canOpen: async (id) => {
    try {
      const entry = toEntry(await execute('contextGetMetadata', { id }));
      return { decision: entry?.id === id ? 'allowed' : 'denied' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return REFUSAL.test(message)
        ? { decision: 'denied' }
        : { decision: 'unknown', reason: message.slice(0, MAX_REASON_CHARS) };
    }
  },
});

/** What an agent's list or search call showed, as the connector's spec maps it; nothing when it does not. */
export const seenIn = (connectorType: string, subAction: string, data: unknown): SourceFile[] =>
  contentSourceOf(connectorType)?.results?.[subAction]?.(data) ?? [];

/**
 * The id of the one file an agent's call read, or undefined: only the connector's declared download reads a file;
 * listings and metadata lookups read nothing.
 */
export const readOf = (
  connectorType: string,
  subAction: string,
  params: Record<string, unknown>
): string | undefined => {
  const read = contentSourceOf(connectorType)?.read;
  if (read === undefined || subAction !== read.action) {
    return undefined;
  }
  const parts = read.id.map((name) => params[name]);
  return parts.every((part) => typeof part === 'string' && part.length > 0)
    ? parts.join(read.separator ?? '')
    : undefined;
};

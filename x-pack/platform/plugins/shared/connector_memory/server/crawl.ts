/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MemoryStore, Permission } from './memory';
import type { Source, SourceFile } from './sources';
import { readableText, summarize, type Chat } from './summarize';

/** Units that may be spent per space per day (a unit is a file read, and with a model, a summary). */
export const createDayBudget = (limit: number, now: () => Date = () => new Date()) => {
  let day = '';
  let spent = new Map<string, number>();
  return {
    take: (key: string): boolean => {
      const today = now().toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        spent = new Map();
      }
      const used = spent.get(key) ?? 0;
      if (used >= limit) {
        return false;
      }
      spent.set(key, used + 1);
      return true;
    },
  };
};

/** Spaces out calls to one connector so a crawl cannot flood the service behind it. */
export const createRateLimiter = (perMinute: number, now: () => number = Date.now) => {
  const next = new Map<string, number>();
  return {
    wait: async (key: string): Promise<void> => {
      const at = Math.max(now(), next.get(key) ?? 0);
      next.set(key, at + 60_000 / perMinute);
      if (at > now()) {
        await new Promise((resolve) => setTimeout(resolve, at - now()));
      }
    },
  };
};

/**
 * Back pressure on summaries, shared by every run in the process so that many agent reads at once cannot multiply the
 * load: a fixed number of files in flight, model calls paced per minute, a file claimed by one run skipped by the
 * others, and a pause after a model failure during which summaries fall back to excerpts.
 */
export const createSummaryPressure = ({
  maxConcurrent,
  perMinute,
  cooldownMs = 60_000,
  now = Date.now,
}: {
  maxConcurrent: number;
  perMinute: number;
  cooldownMs?: number;
  now?: () => number;
}) => {
  const pacer = createRateLimiter(perMinute, now);
  const claimed = new Set<string>();
  const waiting: Array<() => void> = [];
  let active = 0;
  let pausedUntil = 0;
  return {
    /** False when another run already has this file. */
    claim: (key: string): boolean => !claimed.has(key) && !!claimed.add(key),
    release: (key: string): void => void claimed.delete(key),
    /** Runs the work once one of the shared slots is free. */
    slot: async <T>(work: () => Promise<T>): Promise<T> => {
      if (active >= maxConcurrent) {
        await new Promise<void>((resolve) => waiting.push(resolve));
      } else {
        active += 1;
      }
      try {
        return await work();
      } finally {
        const next = waiting.shift();
        if (next) {
          next();
        } else {
          active -= 1;
        }
      }
    },
    pace: () => pacer.wait('model'),
    paused: (): boolean => now() < pausedUntil,
    pause: (): void => {
      pausedUntil = now() + cooldownMs;
    },
  };
};

/** What to remember: a folder crawled down to a depth, and/or files read, and the folders around those. */
export interface CrawlPlan {
  /** Crawl this folder (`''` is the top). Absent: no folder crawl. */
  folder?: string;
  maxDepth: number;
  /** How the crawled folder's files are remembered. */
  mode: 'names' | 'full';
  /** Files to remember, by the source's id, and how. */
  files: string[];
  fileMode: 'names' | 'full';
  /** Also remember the folder of each of `files`, and this many levels below it, the same way as `files`. */
  around?: number;
  /** Files already seen (say in a listing the agent made): remembered by name, with no lookup or read. */
  entries?: SourceFile[];
  maxItems: number;
}

export interface CrawlResult {
  planned: number;
  written: number;
  unchanged: number;
  failed: number;
  truncated: boolean;
}

export interface CrawlContext {
  store: MemoryStore;
  esClient: ElasticsearchClient;
  spaceId: string;
  connectorId: string;
  connectorType: string;
  source: Source;
  permission: Permission;
  /** Without a model, `full` writes the start of each file instead. */
  chat?: Chat;
  budget: ReturnType<typeof createDayBudget>;
  limiter: ReturnType<typeof createRateLimiter>;
  pressure: ReturnType<typeof createSummaryPressure>;
  signal?: AbortSignal;
}

const FULL_CONCURRENCY = 2;
const NAMES_CONCURRENCY = 4;

const forEachConcurrent = async <T>(
  items: T[],
  concurrency: number,
  work: (item: T) => Promise<void>
) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        await work(items[next++]);
      }
    })
  );
};

/**
 * One pass over what the plan names, as the user the connector calls run as: chooses the files (listing folders, looking
 * files up), leaves alone those already remembered well enough, and writes the rest. The scheduled crawl, an agent's
 * read and a manual run all come through here.
 */
export const runCrawl = async (plan: CrawlPlan, context: CrawlContext): Promise<CrawlResult> => {
  const {
    store,
    esClient,
    spaceId,
    connectorId,
    connectorType,
    source,
    permission,
    chat,
    budget,
    limiter,
    pressure,
    signal,
  } = context;
  const result: CrawlResult = { planned: 0, written: 0, unchanged: 0, failed: 0, truncated: false };
  const targets = new Map<string, { file: SourceFile; mode: 'names' | 'full' }>();
  const add = (files: SourceFile[], mode: 'names' | 'full') => {
    for (const file of files) {
      const known = targets.get(file.id);
      if (targets.size < plan.maxItems || known) {
        targets.set(file.id, { file, mode: known?.mode === 'full' ? 'full' : mode });
      } else {
        result.truncated = true;
      }
    }
  };
  const list = async (folder: string, maxDepth: number) => {
    await limiter.wait(connectorId);
    const found = await source.list({ folder, maxDepth, maxFiles: plan.maxItems });
    result.truncated ||= found.truncated;
    return found.files;
  };

  const read: SourceFile[] = [];
  for (const id of plan.files) {
    try {
      read.push(await source.stat(id));
    } catch {
      result.failed += 1;
    }
  }
  add(read, plan.fileMode);
  if (plan.around !== undefined) {
    for (const folder of new Set(read.map((file) => file.folder))) {
      add(await list(folder, plan.around), plan.fileMode);
    }
  }
  if (plan.folder !== undefined) {
    add(await list(plan.folder, plan.maxDepth), plan.mode);
  }
  add(plan.entries ?? [], 'names');
  result.planned = targets.size;

  // The best a file can already be: a model summary, or with no model, an excerpt.
  const best = chat ? 'llm' : 'excerpt';
  const cached = await store.cached(esClient, spaceId, connectorId, [...targets.keys()]);

  const remember = async (file: SourceFile, summary?: Awaited<ReturnType<typeof summarize>>) => {
    const written = await store.remember({
      esClient,
      spaceId,
      connectorId,
      connectorType,
      file,
      summary,
      permission,
    });
    result[written ? 'written' : 'unchanged'] += 1;
  };

  const full = [...targets.values()].filter(({ mode }) => mode === 'full');
  const names = [...targets.values()].filter(({ mode }) => mode === 'names');

  await forEachConcurrent(names, NAMES_CONCURRENCY, async ({ file }) => {
    if (signal?.aborted) {
      return;
    }
    await remember(file).catch(() => void (result.failed += 1));
  });

  await forEachConcurrent(full, FULL_CONCURRENCY, async ({ file }) => {
    if (signal?.aborted) {
      return;
    }
    // Another run is already reading this file: it will remember it.
    const claim = `${spaceId}|${connectorId}|${file.id}`;
    if (!pressure.claim(claim)) {
      return;
    }
    try {
      await pressure.slot(async () => {
        const stored = cached.get(file.id);
        const settled =
          stored &&
          stored.modifiedAt === file.modifiedAt &&
          stored.size === file.size &&
          (stored.kind === best || stored.kind === 'llm');
        // Reading and summarizing is what costs: a file already summarized, or past the day's allowance, is only named.
        if (settled || !budget.take(spaceId)) {
          return await remember(file);
        }
        await limiter.wait(connectorId);
        const raw = await source.readText(file);
        if (raw === undefined) {
          // Not text, or too large to read: it is still worth finding by name.
          return await remember(file);
        }
        const text = readableText(raw, file.mimeType);
        const describe = { name: file.name, url: file.url, text };
        let summary;
        if (chat && !pressure.paused()) {
          await pressure.pace();
          // A model that fails (rate limited, down) pauses summaries for a while; the file keeps an excerpt.
          summary = await summarize({ chat, ...describe }).catch(() => {
            pressure.pause();
            return summarize(describe);
          });
        } else {
          summary = await summarize(describe);
        }
        await remember(file, summary);
      });
    } catch {
      result.failed += 1;
    } finally {
      pressure.release(claim);
    }
  });
  return result;
};

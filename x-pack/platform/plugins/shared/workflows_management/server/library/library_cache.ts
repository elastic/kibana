/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateBody, TemplatesCatalog } from '@kbn/workflows-library';

import { LibraryFetchError, type LibraryFetchErrorReason } from './errors';

export type LibrarySourceMode = 'http' | 'bundle';

export interface LibraryHealth {
  sourceMode: LibrarySourceMode;
  lastRefreshAt: string | null;
  lastError?: { message: string; at: string };
}

/** What failed to load: the catalog, or a template body listed in it. */
export type LibraryOperation = 'catalog' | 'template';

/** The fetch error reason, or `unknown` for an error that is not a {@link LibraryFetchError}. */
export type LibraryFailureReason = LibraryFetchErrorReason | 'unknown';

export type LibraryFailure =
  | { operation: 'catalog'; reason: LibraryFailureReason }
  | {
      operation: 'template';
      reason: LibraryFailureReason;
      /** Slug of the catalog row whose body failed to load. */
      templateSlug: string;
    };

/**
 * Called when the catalog, or one template body, starts failing to load; not
 * again for it until it has loaded once.
 */
export type LibraryFailureListener = (failure: LibraryFailure) => void;

/**
 * Owned in-memory state for the Workflow Template library — the catalog,
 * its resolved per-Kibana-version directory id, lazily-loaded template
 * bodies, and the bookkeeping the fetcher reads to decide whether to
 * refresh and what to surface on `/library/health`.
 *
 * Deliberately no HTTP, no orchestration, no single-flight. Those concerns
 * live in {@link LibraryFetcher}, which owns this cache and mutates it
 * through the narrow setter surface below.
 *
 * `setCatalog` is the only mutation that does more than assign a field: it
 * also drops the slug-keyed body map, because a fresh catalog can re-point
 * a slug at a different `definitionUrl`, and stops tracking the failures of
 * templates the new catalog no longer lists.
 *
 * The optional failure listener hears only status changes: the first failure
 * after a success (or after startup), tracked separately for the catalog and
 * for each template body. A failing upstream read again on every request
 * therefore reports once rather than per read.
 */
export class LibraryCache {
  public catalog?: TemplatesCatalog;
  public versionId?: string;
  private readonly bodies = new Map<string, TemplateBody>();
  private lastRefreshAt?: Date;
  private lastError?: { message: string; at: Date };
  /** Slugs whose body failed to load and hasn't loaded since. */
  private readonly failingTemplates = new Set<string>();

  constructor(
    private readonly ttlMs: number,
    private readonly sourceMode: LibrarySourceMode = 'http',
    private readonly onFailure?: LibraryFailureListener
  ) {}

  isFresh(): boolean {
    if (!this.catalog || !this.lastRefreshAt) return false;
    return Date.now() - this.lastRefreshAt.getTime() < this.ttlMs;
  }

  setCatalog(catalog: TemplatesCatalog): void {
    this.catalog = catalog;
    this.bodies.clear();
    // A template removed from the catalog can't load again, so stop tracking it.
    const listedSlugs = new Set(catalog.templates.map(({ slug }) => slug));
    for (const slug of this.failingTemplates) {
      if (!listedSlugs.has(slug)) this.failingTemplates.delete(slug);
    }
  }

  setVersionId(id: string): void {
    this.versionId = id;
  }

  getBody(slug: string): TemplateBody | undefined {
    return this.bodies.get(slug);
  }

  setBody(slug: string, body: TemplateBody): void {
    this.bodies.set(slug, body);
  }

  markRefreshSuccess(): void {
    this.lastRefreshAt = new Date();
    this.lastError = undefined;
  }

  markRefreshFailure(err: unknown): void {
    const wasFailing = this.lastError !== undefined;
    this.lastError = {
      message: err instanceof Error ? err.message : String(err),
      at: new Date(),
    };
    if (!wasFailing) {
      this.notifyFailure({ operation: 'catalog', reason: getFailureReason(err) });
    }
  }

  markTemplateLoadSuccess(slug: string): void {
    this.failingTemplates.delete(slug);
  }

  markTemplateLoadFailure(slug: string, err: unknown): void {
    if (this.failingTemplates.has(slug)) return;
    this.failingTemplates.add(slug);
    this.notifyFailure({
      operation: 'template',
      reason: getFailureReason(err),
      templateSlug: slug,
    });
  }

  private notifyFailure(failure: LibraryFailure): void {
    try {
      this.onFailure?.(failure);
    } catch {
      // The listener handles its own errors. One that escapes is dropped, so it
      // can't change how the failed load is handled (such as serving the stale catalog).
    }
  }

  getHealth(): LibraryHealth {
    return {
      sourceMode: this.sourceMode,
      lastRefreshAt: this.lastRefreshAt?.toISOString() ?? null,
      lastError: this.lastError
        ? { message: this.lastError.message, at: this.lastError.at.toISOString() }
        : undefined,
    };
  }
}

const getFailureReason = (err: unknown): LibraryFailureReason =>
  err instanceof LibraryFetchError ? err.reason : 'unknown';

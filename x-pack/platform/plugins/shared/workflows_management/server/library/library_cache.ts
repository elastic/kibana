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

export interface LibraryFailure {
  operation: LibraryOperation;
  reason: LibraryFetchErrorReason | 'unknown';
  sourceMode: LibrarySourceMode;
}

/** Called when an operation starts failing, not again until it has succeeded once. */
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
 * a slug at a different `definitionUrl`.
 *
 * The optional failure listener hears only status changes: the first failure
 * after a success (or after startup), so a failing upstream read again on every
 * request reports once rather than per read.
 */
export class LibraryCache {
  public catalog?: TemplatesCatalog;
  public versionId?: string;
  private readonly bodies = new Map<string, TemplateBody>();
  private lastRefreshAt?: Date;
  private lastError?: { message: string; at: Date };
  private templateLoadFailing = false;

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
      this.notifyFailure('catalog', err);
    }
  }

  markTemplateLoadSuccess(): void {
    this.templateLoadFailing = false;
  }

  markTemplateLoadFailure(err: unknown): void {
    if (this.templateLoadFailing) return;
    this.templateLoadFailing = true;
    this.notifyFailure('template', err);
  }

  private notifyFailure(operation: LibraryOperation, err: unknown): void {
    this.onFailure?.({
      operation,
      reason: err instanceof LibraryFetchError ? err.reason : 'unknown',
      sourceMode: this.sourceMode,
    });
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

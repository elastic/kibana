/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EsRequestLimitsConfig } from '../config';
import { EsRequestCategory } from './es_request_categories';

export interface AcquireOptions {
  /** The task type issuing the request, used for logging and as the default scope. */
  taskType?: string;
  /**
   * Grouping key for the sub-limit so multiple task types can share one budget.
   * Defaults to `taskType` when omitted.
   */
  scope?: string;
  /**
   * Cluster-wide concurrency cap for this scope and category. Partitioned across
   * active nodes like the category budget. Undefined means the scope is uncapped.
   */
  scopeLimit?: number;
}

export interface EsRequestCategoryStats {
  /** The effective per-node ceiling, or `undefined` when the category is uncapped. */
  nodeCeiling?: number;
  /** Number of in-flight requests currently counted against the category budget. */
  inFlight: number;
  /** Number of requests rejected since startup for this category budget. */
  rejections: number;
}

export interface EsRequestScopeStats {
  /** The scope grouping key (a shared name, or a task type by default). */
  scope: string;
  /** The request category this budget applies to. */
  category: EsRequestCategory;
  /** The configured cluster-wide limit for this scope and category. */
  clusterWideLimit: number;
  /** The effective per-node ceiling after partitioning across active nodes. */
  nodeCeiling: number;
  /** Number of in-flight requests currently counted against this scope budget. */
  inFlight: number;
  /** Number of requests rejected since startup for this scope budget. */
  rejections: number;
}

export interface EsRequestLimiterStats {
  enabled: boolean;
  activeNodeCount: number;
  categories: Record<EsRequestCategory, EsRequestCategoryStats>;
  scopes: EsRequestScopeStats[];
}

interface ScopeState {
  scope: string;
  category: EsRequestCategory;
  clusterWideLimit: number;
  inFlight: number;
  rejections: number;
}

const CATEGORIES: readonly EsRequestCategory[] = [
  EsRequestCategory.Search,
  EsRequestCategory.Write,
];

/**
 * Enforces a per-node share of a cluster-wide budget of concurrent Elasticsearch
 * requests, per category. The cluster-wide budget is configured statically; each
 * node computes its share as `floor(clusterWide / activeNodeCount)` (min 1) using
 * the live active-node count from the Kibana discovery service.
 *
 * The limiter is a plain in-memory counter — acquiring never queues. When a
 * category (or per-type) budget is exhausted, `tryAcquire` returns `false` and
 * the caller is expected to fail fast.
 */
export class EsRequestLimiter {
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private readonly clusterWideByCategory: Map<EsRequestCategory, number> = new Map();
  private activeNodeCount = 1;

  private readonly inFlightByCategory: Map<EsRequestCategory, number> = new Map();
  private readonly rejectionsByCategory: Map<EsRequestCategory, number> = new Map();
  private readonly scopeStateByKey: Map<string, ScopeState> = new Map();

  constructor({ config, logger }: { config: EsRequestLimitsConfig; logger: Logger }) {
    this.logger = logger;
    this.enabled = config.enabled;

    if (config.search) {
      this.clusterWideByCategory.set(EsRequestCategory.Search, config.search.cluster_wide);
    }
    if (config.write) {
      this.clusterWideByCategory.set(EsRequestCategory.Write, config.write.cluster_wide);
    }
  }

  /**
   * Updates the number of active background-task Kibana nodes. Called whenever
   * the discovery service recounts the cluster so each node's share of the
   * cluster-wide budget stays roughly `clusterWide / activeNodeCount`.
   */
  public setActiveNodeCount(count: number): void {
    this.activeNodeCount = Math.max(1, count);
  }

  /**
   * Partitions a cluster-wide limit into this node's share, guaranteeing each
   * node at least one slot.
   */
  private partition(clusterWide: number): number {
    return Math.max(1, Math.floor(clusterWide / this.activeNodeCount));
  }

  /**
   * The effective per-node ceiling for a category, or `undefined` when the
   * category has no configured budget (uncapped).
   */
  private getNodeCeiling(category: EsRequestCategory): number | undefined {
    const clusterWide = this.clusterWideByCategory.get(category);
    if (clusterWide === undefined) {
      return undefined;
    }
    return this.partition(clusterWide);
  }

  private isCategoryCapped(category: EsRequestCategory): boolean {
    return this.clusterWideByCategory.has(category);
  }

  /** The scope grouping key for a request, defaulting to the task type. */
  private resolveScope(options: AcquireOptions): string | undefined {
    return options.scope ?? options.taskType;
  }

  private getOrCreateScopeState(
    scope: string,
    category: EsRequestCategory,
    clusterWideLimit: number
  ): ScopeState {
    const key = this.getScopeKey(scope, category);
    let state = this.scopeStateByKey.get(key);
    if (!state) {
      state = { scope, category, clusterWideLimit, inFlight: 0, rejections: 0 };
      this.scopeStateByKey.set(key, state);
    } else {
      // Keep the latest declared limit in case it changed between registrations.
      state.clusterWideLimit = clusterWideLimit;
    }
    return state;
  }

  /**
   * Attempts to reserve one slot for a request of the given category. Returns
   * `true` and increments the relevant counters when both the category ceiling
   * and any per-type limit have capacity; otherwise records a rejection and
   * returns `false` without reserving anything. Every successful `tryAcquire`
   * must be matched by exactly one `release` with the same arguments.
   */
  public tryAcquire(category: EsRequestCategory, options: AcquireOptions = {}): boolean {
    if (!this.enabled) {
      return true;
    }

    const { taskType, scopeLimit } = options;
    const scope = this.resolveScope(options);
    const ceiling = this.getNodeCeiling(category);
    const scopeState =
      scope !== undefined && scopeLimit !== undefined
        ? this.getOrCreateScopeState(scope, category, scopeLimit)
        : undefined;

    // Check every gate before reserving anything so a partial reservation is
    // never left behind when one gate rejects.
    if (ceiling !== undefined && (this.inFlightByCategory.get(category) ?? 0) >= ceiling) {
      this.recordCategoryRejection(category, taskType);
      return false;
    }

    if (
      scopeState !== undefined &&
      scopeState.inFlight >= this.partition(scopeState.clusterWideLimit)
    ) {
      this.recordScopeRejection(scopeState, taskType);
      return false;
    }

    if (this.isCategoryCapped(category)) {
      this.inFlightByCategory.set(category, (this.inFlightByCategory.get(category) ?? 0) + 1);
    }
    if (scopeState !== undefined) {
      scopeState.inFlight += 1;
    }

    return true;
  }

  /**
   * Releases a slot previously reserved by `tryAcquire`. Must be called with the
   * same category and options that were passed to the matching `tryAcquire`.
   */
  public release(category: EsRequestCategory, options: AcquireOptions = {}): void {
    if (!this.enabled) {
      return;
    }

    const { scopeLimit } = options;
    const scope = this.resolveScope(options);

    if (this.isCategoryCapped(category)) {
      const current = this.inFlightByCategory.get(category) ?? 0;
      if (current > 0) {
        this.inFlightByCategory.set(category, current - 1);
      }
    }

    if (scope !== undefined && scopeLimit !== undefined) {
      const scopeState = this.scopeStateByKey.get(this.getScopeKey(scope, category));
      if (scopeState && scopeState.inFlight > 0) {
        scopeState.inFlight -= 1;
      }
    }
  }

  public getStats(): EsRequestLimiterStats {
    const categories = CATEGORIES.reduce((acc, category) => {
      acc[category] = {
        nodeCeiling: this.getNodeCeiling(category),
        inFlight: this.inFlightByCategory.get(category) ?? 0,
        rejections: this.rejectionsByCategory.get(category) ?? 0,
      };
      return acc;
    }, {} as Record<EsRequestCategory, EsRequestCategoryStats>);

    const scopes = [...this.scopeStateByKey.values()].map<EsRequestScopeStats>((state) => ({
      scope: state.scope,
      category: state.category,
      clusterWideLimit: state.clusterWideLimit,
      nodeCeiling: this.partition(state.clusterWideLimit),
      inFlight: state.inFlight,
      rejections: state.rejections,
    }));

    return {
      enabled: this.enabled,
      activeNodeCount: this.activeNodeCount,
      categories,
      scopes,
    };
  }

  private getScopeKey(scope: string, category: EsRequestCategory): string {
    return `${scope}:${category}`;
  }

  private recordCategoryRejection(category: EsRequestCategory, taskType?: string): void {
    this.rejectionsByCategory.set(category, (this.rejectionsByCategory.get(category) ?? 0) + 1);
    this.logger.debug(
      `Elasticsearch ${category} request rejected${
        taskType ? ` for task "${taskType}"` : ''
      }: node category budget reached (ceiling=${this.getNodeCeiling(category)}, activeNodes=${
        this.activeNodeCount
      }).`
    );
  }

  private recordScopeRejection(scopeState: ScopeState, taskType?: string): void {
    scopeState.rejections += 1;
    this.logger.debug(
      `Elasticsearch ${scopeState.category} request rejected${
        taskType ? ` for task "${taskType}"` : ''
      }: node budget reached for scope "${scopeState.scope}" (ceiling=${this.partition(
        scopeState.clusterWideLimit
      )}, activeNodes=${this.activeNodeCount}).`
    );
  }
}

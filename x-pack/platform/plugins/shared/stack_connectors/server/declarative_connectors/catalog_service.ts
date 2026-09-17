/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { DeclarativeCatalogHealth, DeclarativeCatalogSkippedEntry } from './types';
import type { CatalogSnapshot, CatalogSpecSource } from './catalog_spec_source';
import { loadDeclarativeConnectorSpec } from './load_declarative_specs';
import { parseDeclarativeConnectorSpec } from './parse_spec';

export interface DeclarativeCatalogServiceOptions {
  source: CatalogSpecSource;
  registryUrl: string;
  refreshIntervalMs: number;
  startupBudgetMs?: number;
  logger: Logger;
}

export interface DeclarativeCatalogRegistrationDeps {
  registerSpec: (spec: ConnectorSpec) => void;
  isTypeRegistered: (actionTypeId: string) => boolean;
}

const DEFAULT_STARTUP_BUDGET_MS = 6_000;

/** Loads catalog snapshots on an interval and exposes health for the internal routes. */
export class DeclarativeCatalogService {
  private snapshot?: CatalogSnapshot;
  private refreshing?: Promise<void>;
  private refreshTimer?: NodeJS.Timeout;
  private lastRefreshAt?: string;
  private lastError?: { message: string; at: string };
  private deps?: DeclarativeCatalogRegistrationDeps;
  private registeredTypeIds: string[] = [];

  constructor(private readonly options: DeclarativeCatalogServiceOptions) {}

  public async start(deps: DeclarativeCatalogRegistrationDeps): Promise<void> {
    this.deps = deps;
    const budgetMs = this.options.startupBudgetMs ?? DEFAULT_STARTUP_BUDGET_MS;
    const firstRefresh = this.refresh().catch((error) => {
      this.options.logger.warn(
        `Declarative connector catalog refresh failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
    let budgetTimer: NodeJS.Timeout | undefined;
    const budget = new Promise<void>((resolve) => {
      budgetTimer = setTimeout(resolve, budgetMs);
    });
    await Promise.race([firstRefresh, budget]);
    if (budgetTimer) {
      clearTimeout(budgetTimer);
    }

    if (this.options.refreshIntervalMs > 0) {
      this.refreshTimer = setInterval(() => {
        void this.refresh().catch((error) => {
          this.options.logger.warn(
            `Declarative connector catalog refresh failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
      }, this.options.refreshIntervalMs);
      this.refreshTimer.unref?.();
    }
  }

  public stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  public refresh = async (): Promise<void> => {
    if (this.refreshing) {
      return this.refreshing;
    }
    this.refreshing = this.runRefresh().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  };

  public getHealth(): DeclarativeCatalogHealth {
    return {
      enabled: true,
      ready: this.lastError === undefined && this.snapshot !== undefined,
      sourceUrl: this.options.registryUrl,
      activeCatalogVersion: this.snapshot?.catalogVersion,
      versions: this.snapshot?.versions ?? [],
      registeredTypeIds: [...this.registeredTypeIds],
      skipped: this.snapshot?.skipped ?? [],
      lastRefreshAt: this.lastRefreshAt,
      lastError: this.lastError,
    };
  }

  private async runRefresh(): Promise<void> {
    try {
      const snapshot = await this.options.source.loadSnapshot();
      this.registerSnapshot(snapshot);
      this.lastRefreshAt = new Date().toISOString();
      this.lastError = undefined;
    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  private registerSnapshot(snapshot: CatalogSnapshot): void {
    const skipped: DeclarativeCatalogSkippedEntry[] = [...snapshot.skipped];
    const deps = this.deps;

    for (const asset of snapshot.assets) {
      try {
        const spec = loadDeclarativeConnectorSpec(asset);
        const id = spec.metadata.id;
        if (this.registeredTypeIds.includes(id)) {
          continue;
        }
        if (deps?.isTypeRegistered(id)) {
          skipped.push({
            id,
            version: identityFromYaml(asset.yaml).version,
            reason: 'already_registered',
          });
          continue;
        }
        deps?.registerSpec(spec);
        this.registeredTypeIds.push(id);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        skipped.push({
          ...identityFromYaml(asset.yaml),
          reason: 'load_failed',
          detail,
        });
      }
    }

    this.snapshot = { ...snapshot, skipped };
  }

  private recordError(error: unknown): void {
    this.lastError = {
      message: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString(),
    };
  }
}

const identityFromYaml = (yaml: string): { id: string; version?: string } => {
  try {
    const parsed = parseDeclarativeConnectorSpec(yaml);
    return { id: parsed.id, version: parsed.version };
  } catch {
    return { id: 'unknown' };
  }
};

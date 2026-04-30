/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import type { MaintenanceWindowAttributes } from '@kbn/maintenance-windows-plugin/common';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import { MaintenanceWindowSavedObjectsClientToken } from './tokens';

/** Default cache TTL for active maintenance window lookups. */
export const DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS = 60 * 1000;

export interface ActiveMaintenanceWindow {
  id: string;
  spaceId: string;
  enabled: boolean;
  events: Array<{ gte: string; lte: string }>;
  scope?: MaintenanceWindowAttributes['scope'];
}

export interface MaintenanceWindowServiceContract {
  /**
   * Returns enabled maintenance windows whose schedule is active at the given time,
   * across all spaces. Uses an internal-user saved-object client and caches results
   * for {@link DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS}.
   */
  getActiveMaintenanceWindows(now: Date): Promise<ActiveMaintenanceWindow[]>;
}

interface CacheEntry {
  expiresAt: number;
  windows: Array<Omit<ActiveMaintenanceWindow, 'spaceId'> & { spaceId: string }>;
}

@injectable()
export class MaintenanceWindowService implements MaintenanceWindowServiceContract {
  private cache: CacheEntry | null = null;
  private inFlight: Promise<CacheEntry['windows']> | null = null;

  constructor(
    @inject(MaintenanceWindowSavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract,
    @inject(LoggerServiceToken)
    private readonly logger: LoggerServiceContract,
    private readonly cacheIntervalMs: number = DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS
  ) {}

  public async getActiveMaintenanceWindows(now: Date): Promise<ActiveMaintenanceWindow[]> {
    const enabledWindows = await this.getEnabledWindows();
    const nowMs = now.getTime();

    return enabledWindows.filter((mw) =>
      mw.events.some((event) => Date.parse(event.gte) <= nowMs && nowMs <= Date.parse(event.lte))
    );
  }

  private async getEnabledWindows(): Promise<CacheEntry['windows']> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.windows;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.fetchEnabledWindows()
      .then((windows) => {
        this.cache = {
          windows,
          expiresAt: Date.now() + this.cacheIntervalMs,
        };
        return windows;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  private async fetchEnabledWindows(): Promise<CacheEntry['windows']> {
    const windows: CacheEntry['windows'] = [];

    try {
      const finder = this.client.createPointInTimeFinder<MaintenanceWindowAttributes>({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        perPage: 1000,
        namespaces: ['*'],
        filter: `${MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
      });

      for await (const response of finder.find()) {
        for (const doc of response.saved_objects) {
          if ('error' in doc && doc.error) continue;

          const spaceId = doc.namespaces?.[0];
          if (!spaceId) continue;

          windows.push({
            id: doc.id,
            spaceId,
            enabled: doc.attributes.enabled,
            events: doc.attributes.events,
            ...(doc.attributes.scope !== undefined ? { scope: doc.attributes.scope } : {}),
          });
        }
      }

      await finder.close();
    } catch (error) {
      this.logger.error({
        error,
        type: 'MaintenanceWindowFetchError',
      });
      return [];
    }

    return windows;
  }
}

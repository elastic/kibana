/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MaintenanceWindowAttributes } from '@kbn/maintenance-windows-plugin/common';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import { savedObjectNamespacesToSpaceId } from '../../space_id_to_namespace';
import { MaintenanceWindowSavedObjectsClientToken } from './tokens';
import type { ActiveMaintenanceWindow } from './types';

export const DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS = 60 * 1000;

interface MaintenanceWindowServiceOptions {
  cacheIntervalMs?: number;
}

interface CacheEntry {
  expiresAt: number;
  windows: ActiveMaintenanceWindow[];
}

export interface MaintenanceWindowServiceContract {
  /**
   * Returns all enabled maintenance windows across all spaces, with each MW's
   * event windows pre-parsed to numeric ms. Callers do per-event matching
   * against the relevant timestamp (e.g. an episode's `last_event_timestamp`),
   * not "is the MW active right now" — an episode that fired during a window
   * that has since closed must still be suppressed when its timestamp falls
   * inside the window.
   */
  getEnabledMaintenanceWindows(): Promise<ActiveMaintenanceWindow[]>;
}

@injectable()
export class MaintenanceWindowService implements MaintenanceWindowServiceContract {
  private cache: CacheEntry | null = null;
  private inFlight: Promise<ActiveMaintenanceWindow[]> | null = null;
  private readonly cacheIntervalMs: number;

  constructor(
    @inject(MaintenanceWindowSavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract,
    @inject(LoggerServiceToken)
    private readonly logger: LoggerServiceContract,
    options: MaintenanceWindowServiceOptions = {}
  ) {
    this.cacheIntervalMs = options.cacheIntervalMs ?? DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS;
  }

  public async getEnabledMaintenanceWindows(): Promise<ActiveMaintenanceWindow[]> {
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

  private async fetchEnabledWindows(): Promise<ActiveMaintenanceWindow[]> {
    const windows: ActiveMaintenanceWindow[] = [];
    const finder = this.client.createPointInTimeFinder<MaintenanceWindowAttributes>({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      perPage: 1000,
      namespaces: ['*'],
      filter: `${MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
    });

    try {
      for await (const response of finder.find()) {
        for (const doc of response.saved_objects) {
          if ('error' in doc && doc.error) continue;

          if (!Array.isArray(doc.attributes.events)) {
            this.logger.warn({
              message: () =>
                `Skipping maintenance window "${doc.id}": missing or invalid events array`,
            });
            continue;
          }

          windows.push({
            id: doc.id,
            spaceId: savedObjectNamespacesToSpaceId(doc.namespaces),
            events: doc.attributes.events.map((event) => ({
              gteMs: Date.parse(event.gte),
              lteMs: Date.parse(event.lte),
            })),
            ...(doc.attributes.scope !== undefined ? { scope: doc.attributes.scope } : {}),
          });
        }
      }
    } catch (error) {
      this.logger.error({
        error,
        type: 'MaintenanceWindowFetchError',
      });
      return [];
    } finally {
      try {
        await finder.close();
      } catch (closeError) {
        this.logger.warn({
          message: () => `Failed to close maintenance window PIT finder: ${closeError.message}`,
        });
      }
    }

    return windows;
  }
}

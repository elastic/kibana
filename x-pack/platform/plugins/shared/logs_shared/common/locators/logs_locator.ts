/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { ALL_LOGS_DATA_VIEW_ID } from '@kbn/discover-utils/src';
import type { TimeRange } from '@kbn/es-query';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';

/**
 * Locator used to link to all log sources in Discover.
 */
export const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

/**
 * Accepts the same parameters as `DiscoverAppLocatorParams`, but automatically sets the data view to all log sources.
 */
export type LogsLocatorParams = DiscoverAppLocatorParams;

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(
    private readonly deps: {
      locators: LocatorClient;
      getLogSourcesService(): Promise<LogsDataAccessPluginStart['services']['logSourcesService']>;
      getIsEsqlDefault(): Promise<boolean>;
    }
  ) {}

  public readonly getTimeRange = (params: LogsLocatorParams) => params.timeRange;

  public readonly setTimeRange = (params: LogsLocatorParams, timeRange?: TimeRange) => ({
    ...params,
    timeRange,
  });

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const discoverAppLocator =
      this.deps.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!;

    const isEsqlDefault = await this.deps.getIsEsqlDefault();

    if (isEsqlDefault && !params.query) {
      const flattenedLogSources = await this.getFlattenedLogSources();

      return discoverAppLocator.getLocation({
        ...params,
        query: { esql: `FROM ${flattenedLogSources}` },
      });
    }

    // When the caller provides its own data view (e.g. Security passing a `dataViewSpec`, or any
    // caller passing a `dataViewId`), delegate it untouched.
    if (params.dataViewId || params.dataViewSpec) {
      return discoverAppLocator.getLocation(params);
    }

    // Backward-compatible default: resolve the "All logs" view by its stable id, which the
    // observability/classic-nav root profiles register as a managed ad hoc data view. Passing an
    // inline spec here would collide with that profile-managed data view (same id), causing data
    // view churn that can hang Discover under CI timing.
    return discoverAppLocator.getLocation({
      dataViewId: ALL_LOGS_DATA_VIEW_ID,
      ...params,
    });
  };

  private async getFlattenedLogSources() {
    const logSourcesService = await this.deps.getLogSourcesService();
    return logSourcesService.getFlattenedLogSources();
  }
}

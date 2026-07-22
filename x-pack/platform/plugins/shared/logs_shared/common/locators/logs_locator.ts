/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { ALL_LOGS_DATA_VIEW_ID, getAllLogsDataViewSpec } from '@kbn/discover-utils/src';
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
export type LogsLocatorParams = DiscoverAppLocatorParams & {
  /**
   * Build and pass an ad-hoc "All logs" data view spec instead of relying on the
   * profile-registered data view id. Needed by callers reachable outside the Observability
   * solution (e.g. Fleet in a Security project), where the id is not registered.
   */
  useAdHocDataView?: boolean;
};

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
    const { useAdHocDataView, ...discoverParams } = params;

    const discoverAppLocator =
      this.deps.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!;

    const isEsqlDefault = await this.deps.getIsEsqlDefault();

    if (isEsqlDefault && !discoverParams.query) {
      const flattenedLogSources = await this.getFlattenedLogSources();

      return discoverAppLocator.getLocation({
        ...discoverParams,
        query: { esql: `FROM ${flattenedLogSources}` },
      });
    }

    // Respect a caller-provided data view (e.g. Security).
    if (discoverParams.dataViewId || discoverParams.dataViewSpec) {
      return discoverAppLocator.getLocation(discoverParams);
    }

    // Build an ad-hoc data view for callers outside the Observability solution,
    // where the all-logs data view id is not registered by a profile.
    if (useAdHocDataView) {
      const flattenedLogSources = await this.getFlattenedLogSources();

      return discoverAppLocator.getLocation({
        dataViewSpec: getAllLogsDataViewSpec({ allLogsIndexPattern: flattenedLogSources }),
        ...discoverParams,
      });
    }

    // Default to the all log sources data view by ID.
    return discoverAppLocator.getLocation({
      dataViewId: ALL_LOGS_DATA_VIEW_ID,
      ...discoverParams,
    });
  };

  private async getFlattenedLogSources() {
    const logSourcesService = await this.deps.getLogSourcesService();
    return logSourcesService.getFlattenedLogSources();
  }
}

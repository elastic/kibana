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
export type LogsLocatorParams = DiscoverAppLocatorParams;

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(
    private readonly deps: {
      locators: LocatorClient;
      getLogSourcesService(): Promise<LogsDataAccessPluginStart['services']['logSourcesService']>;
      getIsEsqlDefault(): Promise<boolean>;
      getActiveSolutionNavId(): Promise<string | null>;
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

    // Respect a caller-provided data view (e.g. onboarding wired streams).
    if (params.dataViewId || params.dataViewSpec) {
      return discoverAppLocator.getLocation(params);
    }

    // The all-logs data view id is only registered by the Observability and Classic root profiles.
    const solutionNavId = await this.deps.getActiveSolutionNavId();
    const allLogsIdIsRegistered = solutionNavId == null || solutionNavId === 'oblt';

    if (allLogsIdIsRegistered) {
      return discoverAppLocator.getLocation({
        dataViewId: ALL_LOGS_DATA_VIEW_ID,
        ...params,
      });
    }

    // Other solutions (e.g. Security) have no profile registering the id, so build an ad-hoc spec.
    const flattenedLogSources = await this.getFlattenedLogSources();

    return discoverAppLocator.getLocation({
      dataViewSpec: getAllLogsDataViewSpec({ allLogsIndexPattern: flattenedLogSources }),
      ...params,
    });
  };

  private async getFlattenedLogSources() {
    const logSourcesService = await this.deps.getLogSourcesService();
    return logSourcesService.getFlattenedLogSources();
  }
}

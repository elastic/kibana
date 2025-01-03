/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_DATASETS_LOCATOR_ID, AllDatasetsLocatorParams } from '@kbn/deeplinks-observability';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { TraceLogsLocatorParams } from './types';

import { getTraceQuery, getTimeRangeEndFromTime, getTimeRangeStartFromTime } from './helpers';

export const TRACE_LOGS_LOCATOR_ID = 'TRACE_LOGS_LOCATOR';

export class TraceLogsLocatorDefinition implements LocatorDefinition<TraceLogsLocatorParams> {
  public readonly id = TRACE_LOGS_LOCATOR_ID;

  constructor(private readonly locators: LocatorClient) {}

  public readonly getLocation = async (params: TraceLogsLocatorParams) => {
    const { time } = params;
    const allDatasetsLocator =
      this.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;
    return allDatasetsLocator.getLocation({
      query: getTraceQuery(params),
      ...(time
        ? {
            timeRange: {
              from: getTimeRangeStartFromTime(time),
              to: getTimeRangeEndFromTime(time),
            },
          }
        : {}),
    });
  };
}

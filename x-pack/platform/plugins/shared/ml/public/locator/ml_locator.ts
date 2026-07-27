/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
import type {
  DataFrameAnalyticsExplorationUrlState,
  MlCommonGlobalState,
  MlLocatorParams,
  MlLocator,
  ChangePointDetectionQueryState,
} from '@kbn/ml-common-types/locator';
import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type { TimeRange } from '@kbn/es-query';
import { formatChangePointDetectionUrl } from './formatters/aiops';
import {
  formatExplorerUrl,
  formatSingleMetricViewerUrl,
  formatDataFrameAnalyticsExplorationUrl,
  formatDataFrameAnalyticsMapUrl,
  formatGenericMlUrl,
} from './formatters';

export type { MlLocatorParams, MlLocator };

export class MlLocatorDefinition implements LocatorDefinition<MlLocatorParams> {
  public readonly id = ML_APP_LOCATOR;
  private validPaths = new Set(Object.values(ML_PAGES));

  public readonly getTimeRange = (params: MlLocatorParams) => {
    const pageState = params.pageState as
      | { timeRange?: MlCommonGlobalState['time']; globalState?: MlCommonGlobalState }
      | undefined;
    return pageState?.timeRange ?? pageState?.globalState?.time;
  };

  public readonly setTimeRange = (params: MlLocatorParams, timeRange?: TimeRange) => ({
    ...params,
    ...(params.pageState
      ? {
          pageState: {
            ...params.pageState,
            timeRange,
          },
        }
      : {}),
  });

  public readonly getLocation = async (params: MlLocatorParams): Promise<KibanaLocation> => {
    let path: string = '';

    if (!this.validPaths.has(params.page)) {
      throw new Error('Page type is not provided or unknown');
    }

    switch (params.page) {
      case ML_PAGES.ANOMALY_EXPLORER:
        path = formatExplorerUrl('', params.pageState);
        break;
      case ML_PAGES.SINGLE_METRIC_VIEWER:
        path = formatSingleMetricViewerUrl('', params.pageState);
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_MAP:
        path = formatDataFrameAnalyticsMapUrl(
          '',
          params.pageState as DataFrameAnalyticsExplorationUrlState['pageState']
        );
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION:
        path = formatDataFrameAnalyticsExplorationUrl('', params.pageState);
        break;
      case ML_PAGES.AIOPS_CHANGE_POINT_DETECTION: {
        const cpState = params.pageState as ChangePointDetectionQueryState;
        if (cpState?.fieldConfigs && cpState?.index) {
          path = formatChangePointDetectionUrl('', cpState);
        } else {
          path = formatGenericMlUrl('', params.page, params.pageState);
        }
        break;
      }
      default:
        path = formatGenericMlUrl('', params.page, params.pageState);
        break;
    }

    return {
      app: 'ml',
      path,
      state: {},
    };
  };
}

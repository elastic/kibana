/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import type { SharePublicSetup, SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { MlLocatorParams } from '../../common/types/locator';
import { ML_PAGES } from '../../common/constants/locator';
import {
  formatAnomalyDetectionCreateJobSelectIndex,
  formatAnomalyDetectionCreateJobSelectType,
  formatAnomalyDetectionJobManagementUrl,
  formatSuppliedConfigurationsManagementUrl,
  formatDataFrameAnalyticsCreateJobUrl,
  formatDataFrameAnalyticsJobManagementUrl,
  formatGenericMlUrl,
  formatEditCalendarUrl,
  formatEditFilterUrl,
  formatEditCalendarDstUrl,
} from './formatters';
import { formatTrainedModelsManagementUrl } from './formatters/trained_models';

/**
 * This class is meant as a wrapper for the Management Locator.
 * This will ensure url formatting is consistent with what it was prior to being moved to the Management section.
 */
export class MlManagementLocatorInternal {
  private _locator: LocatorPublic<SerializableRecord> | undefined;
  private _sectionId: string = 'ml';
  private validPaths = new Set(Object.values(ML_PAGES));

  constructor(share: SharePublicStart | SharePublicSetup) {
    this._locator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
  }

  private getPath = (params: MlLocatorParams) => {
    let path: string = '';
    if (params?.page === undefined) return path;
    if (!this.validPaths.has(params.page)) {
      throw new Error('Page type is not provided or unknown');
    }

    switch (params.page) {
      case ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE:
        path = formatAnomalyDetectionJobManagementUrl('', params.pageState);
        break;
      case ML_PAGES.SUPPLIED_CONFIGURATIONS:
        path = formatSuppliedConfigurationsManagementUrl('', params.pageState);
        break;
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE:
        path = formatAnomalyDetectionCreateJobSelectType('', params.pageState);
        break;
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX:
        path = formatAnomalyDetectionCreateJobSelectIndex('', params.pageState);
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE:
        path = formatDataFrameAnalyticsJobManagementUrl('', params.pageState);
        break;
      case ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB:
        path = formatDataFrameAnalyticsCreateJobUrl('', params.pageState);
        break;
      case ML_PAGES.TRAINED_MODELS_MANAGE:
        path = formatTrainedModelsManagementUrl('', params.pageState);
        break;
      case ML_PAGES.FILTER_LISTS_EDIT:
        path = formatEditFilterUrl('', params.pageState);
        break;
      case ML_PAGES.CALENDARS_EDIT:
        path = formatEditCalendarUrl('', params.pageState);
        break;
      case ML_PAGES.CALENDARS_DST_EDIT:
        path = formatEditCalendarDstUrl('', params.pageState);
        break;
      default:
        path = formatGenericMlUrl('', params.page, params.pageState);
        break;
    }

    return path;
  };

  public readonly getUrl = async (
    params: MlLocatorParams | undefined,
    appId: string = 'anomaly_detection'
  ) => {
    const path = params ? this.getPath(params) : '';
    const url = await this._locator?.getUrl({
      sectionId: this._sectionId,
      appId: `${appId}${path ? '/' + path : ''}`,
    });
    return { path, url };
  };

  public readonly getRedirectUrl = (
    params: MlLocatorParams,
    appId: string = 'anomaly_detection'
  ) => {
    const path = this.getPath(params);
    const url = this._locator?.getRedirectUrl({
      sectionId: this._sectionId,
      appId: `${appId}/${path}`,
    });
    return { path, url };
  };

  public readonly navigate = async (path: string, appId: string = 'anomaly_detection') => {
    await this._locator?.navigate({
      sectionId: this._sectionId,
      appId: `${appId}/${path}`,
    });
  };
}

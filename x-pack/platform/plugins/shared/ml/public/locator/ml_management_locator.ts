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

  constructor(share: SharePublicStart | SharePublicSetup) {
    this._locator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
  }

  private getPath = (params: MlLocatorParams) => {
    let path: string = '';

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
      case ML_PAGES.DATA_DRIFT_INDEX_SELECT:
      case ML_PAGES.DATA_DRIFT_CUSTOM:
      case ML_PAGES.DATA_DRIFT:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_MAP:
      case ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS:
      case ML_PAGES.OVERVIEW:
      case ML_PAGES.SETTINGS:
      case ML_PAGES.FILTER_LISTS_MANAGE:
      case ML_PAGES.FILTER_LISTS_NEW:
      case ML_PAGES.CALENDARS_MANAGE:
      case ML_PAGES.CALENDARS_DST_MANAGE:
      case ML_PAGES.CALENDARS_NEW:
      case ML_PAGES.CALENDARS_DST_NEW:
        path = formatGenericMlUrl('', params.page, params.pageState);
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
        throw new Error('Page type is not provided or unknown');
    }

    return path;
  };

  public readonly getUrl = async (params: MlLocatorParams, appId: string = 'anomaly_detection') => {
    const path = this.getPath(params);
    const url = await this._locator?.getUrl({
      sectionId: this._sectionId,
      appId: `${appId}/${path}`,
    });
    return { path, url };
  };

  public readonly getRedirectUrl = async (
    params: MlLocatorParams,
    appId: string = 'anomaly_detection'
  ) => {
    const path = this.getPath(params);
    const url = await this._locator?.getRedirectUrl({
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

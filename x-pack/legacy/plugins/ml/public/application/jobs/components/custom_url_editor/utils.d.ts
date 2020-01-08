/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/common';
import { UrlConfig } from '../../../../../common/types/custom_urls';
import { Job } from '../../new_job/common/job_creator/configs';
import { TimeRangeType } from './constants';

export interface TimeRange {
  type: TimeRangeType;
  interval: string;
}

export interface CustomUrlSettings {
  label: string;
  type: string;
  // Note timeRange is only editable in new URLs for Dashboard and Discover URLs,
  // as for other URLs we have no way of knowing how the field will be used in the URL.
  timeRange: TimeRange;
  kibanaSettings?: any;
  otherUrlSettings?: {
    urlValue: string;
  };
}

export function getTestUrl(job: Job, customUrl: UrlConfig): Promise<string>;

export function isValidCustomUrlSettingsTimeRange(timeRangeSettings: any): boolean;

export function getNewCustomUrlDefaults(
  job: Job,
  dashboards: any[],
  indexPatterns: IIndexPattern[]
): CustomUrlSettings;
export function getQueryEntityFieldNames(job: Job): string[];
export function isValidCustomUrlSettings(
  settings: CustomUrlSettings,
  savedCustomUrls: UrlConfig[]
): boolean;
export function buildCustomUrlFromSettings(settings: CustomUrlSettings): Promise<UrlConfig>;

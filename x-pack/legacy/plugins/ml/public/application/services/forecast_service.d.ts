/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { Job } from '../jobs/new_job/common/job_creator/configs';

export interface ForecastData {
  success: boolean;
  results: any;
}

export const mlForecastService: {
  getForecastData: (
    job: Job,
    detectorIndex: number,
    forecastId: string,
    entityFields: any[],
    earliestMs: number,
    latestMs: number,
    interval: string,
    aggType: any
  ) => Observable<ForecastData>;
};

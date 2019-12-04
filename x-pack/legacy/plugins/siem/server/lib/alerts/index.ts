/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, RequestBasicOptions } from '../framework';
export * from './elasticsearch_adapter';
import { AlertsAdapter } from './types';
import { AlertsData } from '../../graphql/types';
import { TimelineRequestOptions } from '../events/types';

export class Alerts {
  constructor(private readonly adapter: AlertsAdapter) {}

  public async getAlertsData(
    req: FrameworkRequest,
    options: TimelineRequestOptions
  ): Promise<AlertsData> {
    return this.adapter.getAlertsData(req, options);
  }

  public async getAlertsHistogramData(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<AlertsOverTimeData> {
    return this.adapter.getAlertsHistogramData(req, options);
  }
}

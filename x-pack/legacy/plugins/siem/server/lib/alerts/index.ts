/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, RequestBasicOptions } from '../framework';
export * from './elasticsearch_adapter';
import { AlertsAdapter } from './types';
import { AlertsOverTimeData } from '../../graphql/types';

export class Alerts {
  constructor(private readonly adapter: AlertsAdapter) {}

  public async getAlertsHistogramData(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<AlertsOverTimeData> {
    return this.adapter.getAlertsHistogramData(req, options);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, RequestBasicOptions } from '../framework';
export * from './elasticsearch_adapter';
import { AnomaliesAdapter } from './types';
import { AnomaliesOverTimeData } from '../../../public/graphql/types';

export class Anomalies {
  constructor(private readonly adapter: AnomaliesAdapter) {}

  public async getAnomaliesOverTime(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<AnomaliesOverTimeData> {
    return this.adapter.getAnomaliesOverTime(req, options);
  }
}

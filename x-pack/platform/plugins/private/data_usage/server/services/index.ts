/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValidationError } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import type { MetricTypes } from '../../common/rest_types';
import { AutoOpsError } from '../errors';
import { AutoOpsAPIService } from './autoops_api';

export class DataUsageService {
  private readonly logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
  async getMetrics({
    from,
    to,
    metricTypes,
    dataStreams,
  }: {
    from: string;
    to: string;
    metricTypes: MetricTypes[];
    dataStreams: string[];
  }) {
    try {
      const autoOpsAPIService = new AutoOpsAPIService(this.logger);
      const response = await autoOpsAPIService.autoOpsUsageMetricsAPI({
        from,
        to,
        metricTypes,
        dataStreams,
      });
      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new AutoOpsError(error.message);
      }

      throw error;
    }
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chunk } from 'lodash';
import pMap from 'p-map';
import { ValidationError } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { MetricTypes } from '../../common/rest_types';
import {
  AUTOOPS_MAX_CONCURRENT_REQUESTS,
  AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST,
} from '../../common';
import { AutoOpsError } from '../errors';
import { AutoOpsAPIService } from './autoops_api';
import { mergeMetricsResponses } from './merge_metrics_responses';

export { mergeMetricsResponses } from './merge_metrics_responses';

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

      // AutoOps rejects a request whose `size` exceeds AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST, and
      // `size` is derived from the number of data streams the request covers. Splitting the
      // selection into batches keeps every request within the limit; because the batches are
      // disjoint, their responses can simply be concatenated.
      const batches = chunk(dataStreams, AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST);

      if (batches.length > 1) {
        this.logger.debug(
          `Retrieving usage metrics for ${dataStreams.length} data streams in ${batches.length} requests of up to ${AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST}`
        );
      }

      // A failure in any batch fails the whole request. Returning the batches that did succeed
      // would render a chart that silently omits part of the requested selection, which is harder
      // to notice than an explicit error.
      const responses = await pMap(
        batches,
        (batchedDataStreams) =>
          autoOpsAPIService.autoOpsUsageMetricsAPI({
            from,
            to,
            metricTypes,
            dataStreams: batchedDataStreams,
          }),
        { concurrency: AUTOOPS_MAX_CONCURRENT_REQUESTS }
      );

      return mergeMetricsResponses(responses);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new AutoOpsError(error.message);
      }

      throw error;
    }
  }
}

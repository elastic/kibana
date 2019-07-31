/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { getJobId } from '../../../common/log_analysis';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../adapters/framework';
import { throwErrors, createPlainError } from '../../../common/runtime_types';

export class InfraLogAnalysis {
  constructor(
    private readonly libs: {
      framework: InfraBackendFrameworkAdapter;
    }
  ) {}

  public getJobIds(request: InfraFrameworkRequest, sourceId: string) {
    return {
      logEntryRate: getJobId(this.libs.framework.getSpaceId(request), sourceId, 'log-entry-rate'),
    };
  }

  public async getLogEntryRateBuckets(
    request: InfraFrameworkRequest,
    sourceId: string,
    startTime: number,
    endTime: number
  ) {
    const logRateJobId = this.getJobIds(request, sourceId).logEntryRate;

    const mlBucketResponse = await this.libs.framework.callWithRequest(request, 'ml.getBuckets', {
      jobId: logRateJobId,
      anomaly_score: 0.00001,
      expand: true,
      start: startTime,
      end: endTime,
    });

    const buckets = logRateMlBucketResponseRT
      .decode(mlBucketResponse)
      .map(response => response.buckets)
      .getOrElseL(throwErrors(createPlainError));

    return buckets.map(bucket => ({
      anomalies: bucket.records.map(record => ({
        actualCount: record.actual[0],
        anomalyScore: record.record_score,
        timeRange: {
          startTime: record.timestamp,
          endTime: record.timestamp + record.bucket_span * 1000,
        },
        typicalCount: record.typical[0],
      })),
      anomalyScore: bucket.anomaly_score,
      timeRange: {
        startTime: bucket.timestamp,
        endTime: bucket.timestamp + bucket.bucket_span * 1000,
      },
    }));
  }
}

const logRateMlRecordRT = rt.type({
  actual: rt.array(rt.number),
  bucket_span: rt.number,
  record_score: rt.number,
  timestamp: rt.number,
  typical: rt.array(rt.number),
});

const LogRateMlBucketRT = rt.type({
  anomaly_score: rt.number,
  bucket_span: rt.number,
  records: rt.array(logRateMlRecordRT),
  timestamp: rt.number,
});

const logRateMlBucketResponseRT = rt.type({
  buckets: rt.array(LogRateMlBucketRT),
});

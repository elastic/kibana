/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { getDatafeedAggregations } from '../datafeed_utils';
import { getFirstKeyInObject } from '../object_utils';
import { hasValidComposite } from './has_valid_composite';
import { isTimeSeriesViewDetector } from './is_time_series_view_detector';

// Returns a reason to indicate why the job configuration is not supported
// if the result is undefined, that means the single metric job should be viewable
export function getSingleMetricViewerJobErrorMessage(job: CombinedJob): string | undefined {
  // if job has at least one composite source that is not terms or date_histogram
  const aggs = getDatafeedAggregations(job.datafeed_config);
  if (isPopulatedObject(aggs)) {
    const aggBucketsName = getFirstKeyInObject(aggs);
    if (aggBucketsName !== undefined && aggs[aggBucketsName] !== undefined) {
      // if fieldName is an aggregated field under nested terms using bucket_script

      if (!hasValidComposite(aggs[aggBucketsName])) {
        return i18n.translate(
          'xpack.ml.timeSeriesJob.jobWithUnsupportedCompositeAggregationMessage',
          {
            defaultMessage: 'the datafeed contains unsupported composite sources',
          }
        );
      }
    }
  }
  // only allow jobs with at least one detector whose function corresponds to
  // an ES aggregation which can be viewed in the single metric view and which
  // doesn't use a scripted field which can be very difficult or impossible to
  // invert to a reverse search, or when model plot has been enabled.
  const isChartableTimeSeriesViewJob = job.analysis_config.detectors.some((detector, idx) =>
    isTimeSeriesViewDetector(job, idx)
  );

  if (isChartableTimeSeriesViewJob === false) {
    return i18n.translate('xpack.ml.timeSeriesJob.notViewableTimeSeriesJobMessage', {
      defaultMessage: 'it is not a viewable time series job',
    });
  }
}

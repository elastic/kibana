/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import {
  type Field,
  type Aggregation,
  type SplitField,
  type AggFieldPair,
  DOC_COUNT,
  ES_AGGREGATION,
  ML_JOB_AGGREGATION,
} from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { parseInterval } from '@kbn/ml-parse-interval';
import { cloneDeep } from 'lodash';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { AggregationsCompositeDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import { isSparseDataJob } from './util/general';
import { ML_MEDIAN_PERCENTS } from '../../../../../../common/util/job_utils';

export class MultiMetricJobCreator extends JobCreator {
  // a multi-metric job has one optional overall partition field
  // which is the same for all detectors.
  private _splitField: SplitField = null;

  protected _type: JOB_TYPE = JOB_TYPE.MULTI_METRIC;

  constructor(
    mlApi: MlApi,
    newJobCapsService: NewJobCapsService,
    indexPattern: DataView,
    savedSearch: SavedSearch | null,
    query: object
  ) {
    super(mlApi, newJobCapsService, indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
    this._wizardInitialized$.next(true);
  }

  // set the split field, applying it to each detector
  public setSplitField(field: SplitField) {
    this._splitField = field;

    if (this._splitField === null) {
      this.removeSplitField();
    } else {
      for (let i = 0; i < this._detectors.length; i++) {
        this._detectors[i].partition_field_name = this._splitField.id;
      }
    }
    this._createDatafeedAggregations();
  }

  public removeSplitField() {
    this._detectors.forEach((d) => {
      delete d.partition_field_name;
    });
    this._createDatafeedAggregations();
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = this._createDetector(agg, field);
    this._addDetector(dtr, agg, field);
    this._createDatafeedAggregations();
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    const dtr: Detector = this._createDetector(agg, field);
    this._editDetector(dtr, agg, field, index);
    this._createDatafeedAggregations();
  }

  // create a new detector object, applying the overall split field
  private _createDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._splitField !== null) {
      dtr.partition_field_name = this._splitField.id;
    }
    return dtr;
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._createDatafeedAggregations();
  }

  // remove these and call _createDatafeedAggregations() in the base class
  // _createDatafeedAggregations should be empty in the base class
  public addInfluencer(influencer: string) {
    if (this._influencers.includes(influencer) === false) {
      this._influencers.push(influencer);
    }
    this._createDatafeedAggregations();
  }

  public removeInfluencer(influencer: string) {
    const idx = this._influencers.indexOf(influencer);
    if (idx !== -1) {
      this._influencers.splice(idx, 1);
    }
    this._createDatafeedAggregations();
  }

  public removeAllInfluencers() {
    this._influencers.length = 0;
    this._createDatafeedAggregations();
  }

  // aggregations need to be recreated whenever the detector or bucket_span change
  private _createDatafeedAggregations() {
    if (
      this._detectors.length &&
      typeof this._job_config.analysis_config.bucket_span === 'string' &&
      this._aggs.length > 0
    ) {
      delete this._job_config.analysis_config.summary_count_field_name;
      delete this._datafeed_config.aggregations;

      // if the selected field is called doc_count, we cannot use aggregations
      if (this._fields[0]?.name === DOC_COUNT) {
        return;
      }

      const functionName = this._aggs[0].dslName;
      const timeField = this._job_config.data_description.time_field!;

      const duration = parseInterval(this._job_config.analysis_config.bucket_span, true);
      if (duration === null) {
        return;
      }

      const bucketSpanSeconds = duration.asSeconds();
      const interval = bucketSpanSeconds * 1000;

      let field = null;

      switch (functionName) {
        case ES_AGGREGATION.COUNT:
          this._job_config.analysis_config.summary_count_field_name = DOC_COUNT;

          this._datafeed_config.aggregations = {
            buckets: {
              date_histogram: {
                field: timeField,
                fixed_interval: `${interval}ms`,
              },
              aggregations: {
                [timeField]: {
                  max: {
                    field: timeField,
                  },
                },
              },
            },
          };
          break;
        case ES_AGGREGATION.AVG:
        case ES_AGGREGATION.SUM:
        case ES_AGGREGATION.MIN:
        case ES_AGGREGATION.MAX:
          field = this._fields[0];
          if (field !== null) {
            const fieldName = field.name;
            this._job_config.analysis_config.summary_count_field_name = DOC_COUNT;

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${interval * 0.1}ms`, // use 10% of bucketSpan to allow for better sampling
                },
                aggregations: {
                  [timeField]: {
                    max: {
                      field: timeField,
                    },
                  },
                  [fieldName]: {
                    [functionName]: {
                      field: fieldName,
                    },
                  },
                },
              },
            };
          }
          break;
        case ES_AGGREGATION.PERCENTILES:
          field = this._fields[0];
          if (field !== null) {
            const fieldName = field.name;
            this._job_config.analysis_config.summary_count_field_name = DOC_COUNT;

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${interval * 0.1}ms`, // use 10% of bucketSpan to allow for better sampling
                },
                aggregations: {
                  [timeField]: {
                    max: {
                      field: timeField,
                    },
                  },
                  [fieldName]: {
                    percentiles: {
                      field: fieldName,
                      percents: [Number(ML_MEDIAN_PERCENTS)],
                    },
                  },
                },
              },
            };
          }
          break;
        case ES_AGGREGATION.CARDINALITY:
          field = this._fields[0];
          if (field !== null) {
            const fieldName = field.name;

            this._job_config.analysis_config.summary_count_field_name = `dc_${fieldName}`;

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${interval}ms`,
                },
                aggregations: {
                  [timeField]: {
                    max: {
                      field: timeField,
                    },
                  },
                  [this._job_config.analysis_config.summary_count_field_name]: {
                    [functionName]: {
                      field: fieldName,
                    },
                  },
                },
              },
            };

            const dtr = this._detectors[0];
            // finally, modify the detector before saving
            dtr.function = ML_JOB_AGGREGATION.NON_ZERO_COUNT;
            // add a description using the original function name rather 'non_zero_count'
            // as the user may not be aware it's been changed
            dtr.detector_description = `${functionName} (${fieldName})`;
            delete dtr.field_name;
          }
          break;
        default:
          break;
      }
      this._applySplitFieldToDatafeedAggregations();
    }
  }

  private _applySplitFieldToDatafeedAggregations() {
    const datafeedAggregations = this._datafeed_config.aggregations;
    if (
      datafeedAggregations === undefined ||
      datafeedAggregations.buckets === undefined ||
      datafeedAggregations.buckets.aggregations === undefined
    ) {
      return;
    }
    if (this.influencers.length === 0 && this.splitField === null) {
      return;
    }

    const sourcesSet = new Set(this.influencers);
    if (this.splitField !== null) {
      sourcesSet.add(this.splitField.name);
    }
    const sources = Array.from(sourcesSet);

    if (sources.length > 1) {
      const dateHistogram = cloneDeep(datafeedAggregations.buckets.date_histogram)!;
      delete datafeedAggregations.buckets.date_histogram;
      datafeedAggregations.buckets.composite = {
        size: 1000,
        sources: [
          {
            time_buckets: {
              date_histogram: dateHistogram as AggregationsCompositeDateHistogramAggregation,
            },
          },
          ...sources.map((s) => ({
            [s]: { terms: { field: s } },
          })),
        ],
      };
    } else if (this.splitField) {
      const aggregations = cloneDeep(datafeedAggregations.buckets.aggregations);
      const timeField = this._job_config.data_description.time_field!;
      const timeFieldAgg = aggregations[timeField];
      delete aggregations[timeField];

      const fieldName = this.splitField.name;
      datafeedAggregations.buckets.aggregations = {
        [timeField]: timeFieldAgg,
        [fieldName]: {
          terms: {
            field: fieldName,
            size: 1000,
          },
          aggregations,
        },
      };
    }
  }

  public get aggFieldPairs(): AggFieldPair[] {
    return this.detectors.map((d, i) => ({
      field: this._fields[i],
      agg: this._aggs[i],
    }));
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
    this._sparseData = isSparseDataJob(job, datafeed);
    const detectors = getRichDetectors(
      this.newJobCapsService,
      job,
      datafeed,
      this.additionalFields,
      false
    );

    if (datafeed.aggregations !== undefined) {
      // if we've converting from a single metric job,
      // delete the aggregations.
      delete datafeed.aggregations;
      delete job.analysis_config.summary_count_field_name;
    }

    this.removeAllDetectors();

    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        this.addDetector(dtr.agg, dtr.field);
      }
    });
    if (detectors.length) {
      if (detectors[0].partitionField !== null) {
        this.setSplitField(detectors[0].partitionField);
      }
    }
  }
}

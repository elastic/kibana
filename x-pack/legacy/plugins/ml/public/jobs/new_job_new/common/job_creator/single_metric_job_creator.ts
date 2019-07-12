/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { parseInterval } from 'ui/utils/parse_interval';
import { JobCreator } from './job_creator';
import { IndexPatternWithType } from '../../../../../common/types/kibana';
import { Field, Aggregation } from '../../../../../common/types/fields';
import { Detector, BucketSpan } from './configs';
import { createBasicDetector } from './util/default_configs';
import { KIBANA_AGGREGATION } from '../../../../../common/constants/aggregation_types';
import { JOB_TYPE, CREATED_BY_LABEL } from './util/constants';

export class SingleMetricJobCreator extends JobCreator {
  private _field: Field | null = null;
  protected _type: JOB_TYPE = JOB_TYPE.SINGLE_METRIC;

  constructor(indexPattern: IndexPatternWithType, savedSearch: SavedSearch, query: object) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.SINGLE_METRIC;
  }

  // only a single detector exists for this job type
  // therefore _addDetector and _editDetector merge into this
  // single setDetector function
  public setDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._detectors.length === 0) {
      this._addDetector(dtr, agg);
    } else {
      this._editDetector(dtr, agg, 0);
    }

    this._field = field;

    this._createDatafeedAggregations();
  }

  public set bucketSpan(bucketSpan: BucketSpan) {
    this._job_config.analysis_config.bucket_span = bucketSpan;
    this._createDatafeedAggregations();
  }

  // overriding set means we need to override get too
  // JS doesn't do inheritance very well
  public get bucketSpan(): BucketSpan {
    return this._job_config.analysis_config.bucket_span;
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

      const functionName = this._aggs[0].dslName;
      const timeField = this._job_config.data_description.time_field;

      const duration = parseInterval(this._job_config.analysis_config.bucket_span);
      if (duration === null) {
        return;
      }

      const bucketSpanSeconds = duration.asSeconds();
      const interval = bucketSpanSeconds * 1000;

      switch (functionName) {
        case KIBANA_AGGREGATION.COUNT:
          this._job_config.analysis_config.summary_count_field_name = 'doc_count';

          this._datafeed_config.aggregations = {
            buckets: {
              date_histogram: {
                field: timeField,
                interval: `${interval}ms`,
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
        case KIBANA_AGGREGATION.AVG:
        case KIBANA_AGGREGATION.MEDIAN:
        case KIBANA_AGGREGATION.SUM:
        case KIBANA_AGGREGATION.MIN:
        case KIBANA_AGGREGATION.MAX:
          if (this._field !== null) {
            const fieldName = this._field.name;
            this._job_config.analysis_config.summary_count_field_name = 'doc_count';

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  interval: `${interval * 0.1}ms`, // use 10% of bucketSpan to allow for better sampling
                },
                aggregations: {
                  [fieldName]: {
                    [functionName]: {
                      field: fieldName,
                    },
                  },
                  [timeField]: {
                    max: {
                      field: timeField,
                    },
                  },
                },
              },
            };
          }
          break;
        case KIBANA_AGGREGATION.CARDINALITY:
          if (this._field !== null) {
            const fieldName = this._field.name;

            this._job_config.analysis_config.summary_count_field_name = `dc_${fieldName}`;

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  interval: `${interval}ms`,
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
            dtr.function = 'non_zero_count';
            // add a description using the original function name rather 'non_zero_count'
            // as the user may not be aware it's been changed
            dtr.detector_description = `${functionName} (${fieldName})`;
            delete dtr.field_name;
          }
          break;
        default:
          break;
      }
    }
  }
}

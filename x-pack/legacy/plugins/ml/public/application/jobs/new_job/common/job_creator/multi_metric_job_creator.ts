/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { JobCreator } from './job_creator';
import {
  Field,
  Aggregation,
  SplitField,
  AggFieldPair,
} from '../../../../../../common/types/fields';
import { Job, Datafeed, Detector } from './configs';
import { createBasicDetector } from './util/default_configs';
import {
  JOB_TYPE,
  CREATED_BY_LABEL,
  DEFAULT_MODEL_MEMORY_LIMIT,
} from '../../../../../../common/constants/new_job';
import { ml } from '../../../../services/ml_api_service';
import { getRichDetectors } from './util/general';

export class MultiMetricJobCreator extends JobCreator {
  // a multi metric job has one optional overall partition field
  // which is the same for all detectors.
  private _splitField: SplitField = null;
  private _lastEstimatedModelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT;
  protected _type: JOB_TYPE = JOB_TYPE.MULTI_METRIC;

  constructor(
    indexPattern: IndexPattern,
    savedSearch: SavedSearchSavedObject | null,
    query: object
  ) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
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
  }

  public removeSplitField() {
    this._detectors.forEach(d => {
      delete d.partition_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = this._createDetector(agg, field);
    this._addDetector(dtr, agg, field);
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    const dtr: Detector = this._createDetector(agg, field);
    this._editDetector(dtr, agg, field, index);
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
  }

  // called externally to set the model memory limit based current detector configuration
  public async calculateModelMemoryLimit() {
    if (this._splitField === null) {
      // not split field, use the default
      this.modelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT;
    } else {
      const fieldNames = this._detectors.map(d => d.field_name).filter(fn => fn !== undefined);
      const { modelMemoryLimit } = await ml.calculateModelMemoryLimit({
        indexPattern: this._indexPatternTitle,
        splitFieldName: this._splitField.name,
        query: this._datafeed_config.query,
        fieldNames,
        influencerNames: this._influencers,
        timeFieldName: this._job_config.data_description.time_field,
        earliestMs: this._start,
        latestMs: this._end,
      });

      try {
        if (this.modelMemoryLimit === null) {
          this.modelMemoryLimit = modelMemoryLimit;
        } else {
          // To avoid overwriting a possible custom set model memory limit,
          // it only gets set to the estimation if the current limit is either
          // the default value or the value of the previous estimation.
          // That's our best guess if the value hasn't been customized.
          // It doesn't get it if the user intentionally for whatever reason (re)set
          // the value to either the default or pervious estimate.
          // Because the string based limit could contain e.g. MB/Mb/mb
          // all strings get lower cased for comparison.
          const currentModelMemoryLimit = this.modelMemoryLimit.toLowerCase();
          const defaultModelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT.toLowerCase();
          if (
            currentModelMemoryLimit === defaultModelMemoryLimit ||
            currentModelMemoryLimit === this._lastEstimatedModelMemoryLimit
          ) {
            this.modelMemoryLimit = modelMemoryLimit;
          }
        }
        this._lastEstimatedModelMemoryLimit = modelMemoryLimit.toLowerCase();
      } catch (error) {
        if (this.modelMemoryLimit === null) {
          this.modelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT;
        } else {
          // To avoid overwriting a possible custom set model memory limit,
          // the limit is reset to the default only if the current limit matches
          // the previous estimated limit.
          const currentModelMemoryLimit = this.modelMemoryLimit.toLowerCase();
          if (currentModelMemoryLimit === this._lastEstimatedModelMemoryLimit) {
            this.modelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT;
          }
          // eslint-disable-next-line no-console
          console.error('Model memory limit could not be calculated', error);
        }
      }
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
    const detectors = getRichDetectors(job, datafeed, this.scriptFields, false);

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

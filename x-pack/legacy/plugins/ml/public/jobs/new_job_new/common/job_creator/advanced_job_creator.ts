/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPattern } from 'ui/index_patterns';
import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField, AggFieldPair } from '../../../../../common/types/fields';
import { Job, Datafeed, Detector } from './configs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL, DEFAULT_MODEL_MEMORY_LIMIT } from './util/constants';
import { ml } from '../../../../services/ml_api_service';
import { getRichDetectors } from './util/general';

interface RichDetector {
  agg: Aggregation;
  field: Field;
  byField: SplitField;
  overField: SplitField;
  partitionField: SplitField;
  excludeFrequent: string | null;
}

export class AdvancedJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ADVANCED;
  private _richDetectors: RichDetector[] = [];

  constructor(indexPattern: IndexPattern, savedSearch: SavedSearch, query: object) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
  }

  public addDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: string | null
  ) {
    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent
    );

    this._addDetector(detector, agg, field);
    this._richDetectors.push(richDetector);
  }

  public editDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: string | null,
    index: number
  ) {
    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent
    );

    this._editDetector(detector, agg, field, index);

    if (this._richDetectors[index] !== undefined) {
      this._richDetectors[index] = richDetector;
    }
  }

  // create a new detector object, applying the overall split field
  private _createDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: string | null
  ): { detector: Detector; richDetector: RichDetector } {
    const detector: Detector = createBasicDetector(agg, field);

    if (byField !== null) {
      detector.by_field_name = byField.id;
    }
    if (overField !== null) {
      detector.over_field_name = overField.id;
    }
    if (partitionField !== null) {
      detector.partition_field_name = partitionField.id;
    }
    if (excludeFrequent !== null) {
      detector.exclude_frequent = excludeFrequent;
    }

    const richDetector: RichDetector = {
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
    };

    return { detector, richDetector };
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._richDetectors.splice(index, 1);
  }

  // public get aggFieldPairs(): AggFieldPair[] {
  //   return this.detectors.map((d, i) => ({
  //     field: this._fields[i],
  //     agg: this._aggs[i],
  //   }));
  // }

  // public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
  //   this._overrideConfigs(job, datafeed);
  //   this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
  //   const detectors = getRichDetectors(job, datafeed);
  //   if (datafeed.aggregations !== undefined) {
  //     // if we've converting from a single metric job,
  //     // delete the aggregations.
  //     delete datafeed.aggregations;
  //     delete job.analysis_config.summary_count_field_name;
  //   }
  //   this.removeAllDetectors();
  //   detectors.forEach((d, i) => {
  //     const dtr = detectors[i];
  //     if (dtr.agg !== null && dtr.field !== null) {
  //       this.addDetector(dtr.agg, dtr.field);
  //     }
  //   });
  //   if (detectors.length) {
  //     if (detectors[0].partitionField !== null) {
  //       this.setSplitField(detectors[0].partitionField);
  //     }
  //   }
  // }
}

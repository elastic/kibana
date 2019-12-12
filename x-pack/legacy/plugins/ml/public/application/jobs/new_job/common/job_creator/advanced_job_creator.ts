/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';

import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField } from '../../../../../../common/types/fields';
import { Job, Datafeed, Detector, CustomRule } from './configs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import { isValidJson } from '../../../../../../common/util/validation_utils';
import { ml } from '../../../../services/ml_api_service';

export interface RichDetector {
  agg: Aggregation | null;
  field: SplitField;
  byField: SplitField;
  overField: SplitField;
  partitionField: SplitField;
  excludeFrequent: string | null;
  description: string | null;
  customRules: CustomRule[] | null;
}

export class AdvancedJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ADVANCED;
  private _richDetectors: RichDetector[] = [];
  private _queryString: string;

  constructor(
    indexPattern: IndexPattern,
    savedSearch: SavedSearchSavedObject | null,
    query: object
  ) {
    super(indexPattern, savedSearch, query);

    this._queryString = JSON.stringify(this._datafeed_config.query);
  }

  public addDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: string | null,
    description: string | null
  ) {
    // addDetector doesn't support adding new custom rules.
    // this will be added in the future once it's supported in the UI
    const customRules = null;
    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules
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
    description: string | null,
    index: number
  ) {
    const customRules =
      this._detectors[index] !== undefined ? this._detectors[index].custom_rules || null : null;

    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules
    );

    this._editDetector(detector, agg, field, index);

    if (this._richDetectors[index] !== undefined) {
      this._richDetectors[index] = richDetector;
    }
  }

  private _createDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: string | null,
    description: string | null,
    customRules: CustomRule[] | null
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
    if (description !== null) {
      detector.detector_description = description;
    }
    if (customRules !== null) {
      detector.custom_rules = customRules;
    }

    const richDetector: RichDetector = {
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules,
    };

    return { detector, richDetector };
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._richDetectors.splice(index, 1);
  }

  public get richDetectors(): RichDetector[] {
    return this._richDetectors;
  }

  public get queryString(): string {
    return this._queryString;
  }

  public set queryString(qs: string) {
    this._queryString = qs;
  }

  public get isValidQueryString(): boolean {
    return isValidJson(this._queryString);
  }

  // load the start and end times for the selected index
  // and apply them to the job creator
  public async autoSetTimeRange() {
    try {
      const { start, end } = await ml.getTimeFieldRange({
        index: this._indexPatternTitle,
        timeFieldName: this.timeFieldName,
        query: this.query,
      });
      this.setTimeRange(start.epoch, end.epoch);
    } catch (error) {
      throw Error(error);
    }
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    const detectors = getRichDetectors(job, datafeed, this.scriptFields, true);

    // keep track of the custom rules for each detector
    const customRules = this._detectors.map(d => d.custom_rules);

    this.removeAllDetectors();
    this._richDetectors.length = 0;

    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        this.addDetector(
          dtr.agg,
          dtr.field,
          dtr.byField,
          dtr.overField,
          dtr.partitionField,
          dtr.excludeFrequent,
          dtr.description
        );
      }
    });

    // re-apply custom rules
    customRules.forEach((cr, i) => {
      if (cr !== undefined) {
        this._detectors[i].custom_rules = cr;
      }
    });
  }
}

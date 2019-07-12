/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { JobCreator } from './job_creator';
import { IndexPatternWithType } from '../../../../../common/types/kibana';
import { Field, Aggregation, SplitField } from '../../../../../common/types/fields';
import { Detector } from './configs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from './util/constants';

export class MultiMetricJobCreator extends JobCreator {
  // a multi metric job has one optional overall partition field
  // which is the same for all detectors.
  private _splitField: SplitField = null;
  protected _type: JOB_TYPE = JOB_TYPE.MULTI_METRIC;

  constructor(indexPattern: IndexPatternWithType, savedSearch: SavedSearch, query: object) {
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

  public addDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = this._createDetector(agg, field);
    this._addDetector(dtr, agg);
  }

  public editDetector(agg: Aggregation, field: Field | null, index: number) {
    const dtr: Detector = this._createDetector(agg, field);
    this._editDetector(dtr, agg, index);
  }

  // create a new detector object, applying the overall split field
  private _createDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._splitField !== null) {
      dtr.partition_field_name = this._splitField.id;
    }
    return dtr;
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
  }
}

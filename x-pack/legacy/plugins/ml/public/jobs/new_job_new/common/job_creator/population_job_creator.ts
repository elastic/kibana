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

export class PopulationJobCreator extends JobCreator {
  // a population job has one overall over (split) field, which is the same for all detectors
  // each detector has an optional by field
  private _splitField: SplitField = null;
  private _byFields: SplitField[] = [];
  protected _type: JOB_TYPE = JOB_TYPE.POPULATION;

  constructor(indexPattern: IndexPatternWithType, savedSearch: SavedSearch, query: object) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.POPULATION;
  }

  // add a by field to a specific detector
  public setByField(field: SplitField, index: number) {
    if (field === null) {
      this.removeByField(index);
    } else {
      if (this._detectors[index] !== undefined) {
        this._byFields[index] = field;
        this._detectors[index].by_field_name = field.id;
      }
    }
  }

  // remove a by field from a specific detector
  public removeByField(index: number) {
    if (this._detectors[index] !== undefined) {
      this._byFields[index] = null;
      delete this._detectors[index].by_field_name;
    }
  }

  // get the by field for a specific detector
  public getByField(index: number): SplitField {
    if (this._byFields[index] === undefined) {
      return null;
    }
    return this._byFields[index];
  }

  // add an over field to all detectors
  public setSplitField(field: SplitField) {
    this._splitField = field;

    if (this._splitField === null) {
      this.removeSplitField();
    } else {
      for (let i = 0; i < this._detectors.length; i++) {
        this._detectors[i].over_field_name = this._splitField.id;
      }
    }
  }

  // remove over field from all detectors
  public removeSplitField() {
    this._detectors.forEach(d => {
      delete d.over_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = this._createDetector(agg, field);

    this._addDetector(dtr, agg);
    this._byFields.push(null);
  }

  // edit a specific detector, reapplying the by field
  // already set on the the detector at that index
  public editDetector(agg: Aggregation, field: Field | null, index: number) {
    const dtr: Detector = this._createDetector(agg, field);

    const sp = this._byFields[index];
    if (sp !== undefined && sp !== null) {
      dtr.by_field_name = sp.id;
    }

    this._editDetector(dtr, agg, index);
  }

  // create a detector object, adding the current over field
  private _createDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (field !== null) {
      dtr.field_name = field.id;
    }

    if (this._splitField !== null) {
      dtr.over_field_name = this._splitField.id;
    }
    return dtr;
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._byFields.splice(index, 1);
  }
}

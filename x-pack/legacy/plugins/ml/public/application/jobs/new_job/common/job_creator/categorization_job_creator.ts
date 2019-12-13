/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { JobCreator } from './job_creator';
import { Field, Aggregation, mlCategory } from '../../../../../../common/types/fields';
import { Job, Datafeed, Detector } from './configs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';

export class CategorizationJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.CATEGORIZATION;
  private _createDetector: () => void = () => {};

  constructor(
    indexPattern: IndexPattern,
    savedSearch: SavedSearchSavedObject | null,
    query: object
  ) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.CATEGORIZATION;
  }

  public setDefaultDetectorProperties(count: Aggregation | null, eventRate: Field | null) {
    if (count === null || eventRate === null) {
      return;
    }
    const dtr: Detector = createBasicDetector(count, eventRate);
    dtr.by_field_name = mlCategory.id;
    this._createDetector = () => {
      this._addDetector(dtr, count, mlCategory);
    };
  }

  public set categorizationFieldName(fieldName: string | null) {
    this.removeAllDetectors();
    this.removeAllInfluencers();

    if (fieldName !== null) {
      this._job_config.analysis_config.categorization_field_name = fieldName;
      this._createDetector();
      this.addInfluencer(mlCategory.id);
    } else {
      delete this._job_config.analysis_config.categorization_field_name;
    }
  }

  public get categorizationFieldName(): string | null {
    return this._job_config.analysis_config.categorization_field_name || null;
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.CATEGORIZATION;
    const detectors = getRichDetectors(job, datafeed, this.scriptFields, false);

    this.removeAllDetectors();

    const dtr = detectors[0];
    if (detectors.length && dtr.agg !== null && dtr.field !== null) {
      this.setDefaultDetectorProperties(dtr.agg, dtr.field);
      this._createDetector();
    }
  }
}

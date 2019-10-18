/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPattern } from 'ui/index_patterns';

import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField } from '../../../../../common/types/fields';
import { Job, Datafeed, Detector } from './configs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE } from './util/constants';
import { getRichDetectors } from './util/general';
import { isValidJson } from '../../../../../common/util/validation_utils';
import { ml } from '../../../../services/ml_api_service';

export interface RichDetector {
  agg: Aggregation | null;
  field: SplitField;
  byField: SplitField;
  overField: SplitField;
  partitionField: SplitField;
  excludeFrequent: string | null;
  description: string | null;
}

export class AdvancedJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ADVANCED;
  private _richDetectors: RichDetector[] = [];
  private _queryString: string;

  // TODO - remove constructor if it isn't needed
  constructor(indexPattern: IndexPattern, savedSearch: SavedSearch, query: object) {
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
    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description
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
    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description
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
    description: string | null
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

    const richDetector: RichDetector = {
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
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
    const detectors = getRichDetectors(job, datafeed, true);

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
  }
}

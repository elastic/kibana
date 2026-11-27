/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Field,
  type Aggregation,
  type SplitField,
  type AggFieldPair,
} from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { EsqlJobCreatorBase } from './esql_job_creator_base';
import { createBasicDetector } from './util/default_configs';
import { getRichDetectors } from './util/general';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';

/**
 * Job creator for the basic ES|QL wizard. Like a multi-metric job, its detectors share an
 * optional partition field.
 */
export class EsqlBasicJobCreator extends EsqlJobCreatorBase {
  protected _type: JOB_TYPE = JOB_TYPE.ESQL_BASIC;
  private _splitField: SplitField = null;

  constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService) {
    super(mlApi, newJobCapsService);
    this.createdBy = CREATED_BY_LABEL.ESQL_BASIC;
    this._wizardInitialized$.next(true);
  }

  public setSplitField(field: SplitField) {
    this._splitField = field;

    if (this._splitField === null) {
      this.removeSplitField();
    } else {
      for (const detector of this._detectors) {
        detector.partition_field_name = this._splitField.id;
      }
    }
  }

  public removeSplitField() {
    this._detectors.forEach((d) => {
      delete d.partition_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    this._addDetector(this._createDetector(agg, field), agg, field);
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    this._editDetector(this._createDetector(agg, field), agg, field, index);
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
  }

  public get aggFieldPairs(): AggFieldPair[] {
    return this.detectors.map((d, i) => ({
      field: this._fields[i],
      agg: this._aggs[i],
    }));
  }

  private _createDetector(agg: Aggregation, field: Field): Detector {
    const detector: Detector = createBasicDetector(agg, field);
    if (this._splitField !== null) {
      detector.partition_field_name = this._splitField.id;
    }
    return detector;
  }

  protected _restoreDetectors() {
    const detectors = getRichDetectors(
      this.newJobCapsService,
      this._job_config,
      this._datafeed_config,
      this.additionalFields,
      false
    );
    this.removeAllDetectors();
    for (const { agg, field } of detectors) {
      if (agg !== null && field !== null) {
        this.addDetector(agg, field);
      }
    }
    if (detectors.length > 0) {
      this.setSplitField(detectors[0].partitionField);
    }
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideEsqlConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.ESQL_BASIC;
  }
}

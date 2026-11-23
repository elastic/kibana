/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, Aggregation, SplitField, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';

/** Job creator for the ES|QL wizard, which starts without a data view. */
export class EsqlJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ESQL;
  private _indexPattern: DataView | null = null;
  // like a multi-metric job, an optional partition field shared by all detectors
  private _splitField: SplitField = null;

  constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService) {
    super(mlApi, newJobCapsService);
    this.createdBy = CREATED_BY_LABEL.ESQL;
    this._wizardInitialized$.next(true);
  }

  public get esqlQuery(): string {
    return this._datafeed_config.esql_query ?? '';
  }

  public set esqlQuery(query: string) {
    this._datafeed_config.esql_query = query;
  }

  public get dataView(): DataView | null {
    return this._indexPattern;
  }
  // !!!!!!!!!!!!!!!! this needs to be more flexible, more like population job creator
  /** Sets the temporary data view created from the ES|QL query's source. */
  public set indexPattern(dataView: DataView) {
    this._indexPattern = dataView;
    const title = dataView.getIndexPattern();
    const name = dataView.getName();
    this._indexPatternTitle = title;
    this._indexPatternDisplayName = name === title ? name : `${name} (${title})`;
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

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.ESQL;
  }
}

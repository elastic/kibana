/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MLCATEGORY, type Field, type Aggregation, type SplitField } from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { EsqlJobCreatorBase } from './esql_job_creator_base';
import { createRichDetector, type RichDetector } from './util/rich_detector';
import { getRichDetectors } from './util/general';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';

/**
 * Job creator for the advanced ES|QL wizard. Like an advanced job, each detector has its own
 * by, over and partition fields.
 */
export class EsqlAdvancedJobCreator extends EsqlJobCreatorBase {
  protected _type: JOB_TYPE = JOB_TYPE.ESQL_ADVANCED;
  private _richDetectors: RichDetector[] = [];

  constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService) {
    super(mlApi, newJobCapsService);
    this.createdBy = CREATED_BY_LABEL.ESQL_ADVANCED;
    this._wizardInitialized$.next(true);
  }

  public addDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: estypes.MlExcludeFrequent | null,
    description: string | null,
    useNull: boolean | null
  ) {
    // like the advanced wizard, new detectors have no custom rules
    const { detector, richDetector } = createRichDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      null,
      useNull
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
    excludeFrequent: estypes.MlExcludeFrequent | null,
    description: string | null,
    index: number,
    useNull: boolean | null
  ) {
    const customRules = this._detectors[index]?.custom_rules ?? null;
    const { detector, richDetector } = createRichDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules,
      useNull
    );
    this._editDetector(detector, agg, field, index);
    if (this._richDetectors[index] !== undefined) {
      this._richDetectors[index] = richDetector;
    }
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._richDetectors.splice(index, 1);
  }

  public get richDetectors(): RichDetector[] {
    return this._richDetectors;
  }

  protected _restoreDetectors() {
    // drop the categorization field, and the detectors that split on its categories, if the
    // query no longer returns it
    const { categorizationFieldName } = this;
    const hasCategorizationField =
      categorizationFieldName !== null &&
      this.newJobCapsService.catFields.some(({ id }) => id === categorizationFieldName);
    if (hasCategorizationField === false) {
      this.categorizationFieldName = null;
    }

    const detectors = getRichDetectors(
      this.newJobCapsService,
      this._job_config,
      this._datafeed_config,
      this.additionalFields,
      true
    );
    // keep the custom rules of each detector, which the detector list cannot edit
    const customRules = this._detectors.map(({ custom_rules: rules }) => rules);

    this.removeAllDetectors();
    this._richDetectors.length = 0;

    detectors.forEach((dtr, i) => {
      const usesMlCategory = [dtr.byField, dtr.overField, dtr.partitionField].some(
        (splitField) => splitField?.id === MLCATEGORY
      );
      if (dtr.agg === null || dtr.field === null || (usesMlCategory && !hasCategorizationField)) {
        return;
      }
      this.addDetector(
        dtr.agg,
        dtr.field,
        dtr.byField,
        dtr.overField,
        dtr.partitionField,
        dtr.excludeFrequent,
        dtr.description,
        dtr.useNull
      );
      const rules = customRules[i];
      const index = this._detectors.length - 1;
      if (rules !== undefined) {
        this._detectors[index].custom_rules = rules;
        this._richDetectors[index].customRules = rules;
      }
    });
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideEsqlConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.ESQL_ADVANCED;
  }
}

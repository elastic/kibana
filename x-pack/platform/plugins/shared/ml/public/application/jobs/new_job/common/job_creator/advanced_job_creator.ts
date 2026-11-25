/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, Aggregation, SplitField } from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';

import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import { JobCreatorClassic } from './job_creator_classic';
import { createRichDetector, type RichDetector } from './util/rich_detector';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import { isValidJson } from '../../../../../../common/util/validation_utils';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';

export type { RichDetector };

export class AdvancedJobCreator extends JobCreatorClassic {
  protected _type: JOB_TYPE = JOB_TYPE.ADVANCED;
  private _richDetectors: RichDetector[] = [];
  private _queryString: string;

  constructor(
    mlApi: MlApi,
    newJobCapsService: NewJobCapsService,
    indexPattern: DataView,
    savedSearch: SavedSearch | null,
    query: object
  ) {
    super(mlApi, newJobCapsService, indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.ADVANCED;

    this._queryString = JSON.stringify(this._datafeed_config.query);

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
    // addDetector doesn't support adding new custom rules.
    // this will be added in the future once it's supported in the UI
    const customRules = null;
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
    const customRules =
      this._detectors[index] !== undefined ? this._detectors[index].custom_rules || null : null;

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

  public get queryString(): string {
    return this._queryString;
  }

  public set queryString(qs: string) {
    this._queryString = qs;
  }

  public get isValidQueryString(): boolean {
    return isValidJson(this._queryString);
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.ADVANCED;
    const detectors = getRichDetectors(
      this.newJobCapsService,
      job,
      datafeed,
      this.additionalFields,
      true
    );

    // keep track of the custom rules for each detector
    const customRules = this._detectors.map((d) => d.custom_rules);

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
          dtr.description,
          dtr.useNull
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

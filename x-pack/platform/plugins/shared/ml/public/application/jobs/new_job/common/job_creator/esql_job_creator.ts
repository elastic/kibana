/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';

/** Job creator for the ES|QL wizard, which does not use a data view. */
export class EsqlJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ESQL;

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

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.ESQL;
  }
}

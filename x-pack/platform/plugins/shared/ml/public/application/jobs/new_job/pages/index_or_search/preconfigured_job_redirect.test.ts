/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detector, Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { getEsqlWizardUrl } from './preconfigured_job_redirect';

const createJob = (detectors: Detector[]) => ({ analysis_config: { detectors } } as Job);

describe('getEsqlWizardUrl', () => {
  it('returns basic ES|QL jobs to the basic wizard', () => {
    const job = createJob([
      { function: 'mean', field_name: 'avg_bytes', partition_field_name: 'host' },
      { function: 'count', partition_field_name: 'host' },
    ]);

    expect(getEsqlWizardUrl(CREATED_BY_LABEL.ESQL_BASIC, job)).toBe('jobs/new_job/esql?_g=()');
  });

  it('opens basic ES|QL jobs the basic wizard cannot show in the advanced wizard', () => {
    expect(
      getEsqlWizardUrl(
        CREATED_BY_LABEL.ESQL_BASIC,
        createJob([{ function: 'count', by_field_name: 'status' }])
      )
    ).toBe('jobs/new_job/esql_advanced?_g=()');
    expect(
      getEsqlWizardUrl(
        CREATED_BY_LABEL.ESQL_BASIC,
        createJob([
          { function: 'count', partition_field_name: 'host' },
          { function: 'count', partition_field_name: 'status' },
        ])
      )
    ).toBe('jobs/new_job/esql_advanced?_g=()');
  });

  it('opens other ES|QL jobs in the advanced wizard', () => {
    const job = createJob([{ function: 'count' }]);

    expect(getEsqlWizardUrl(CREATED_BY_LABEL.ESQL_ADVANCED, job)).toBe(
      'jobs/new_job/esql_advanced?_g=()'
    );
    expect(getEsqlWizardUrl(undefined, job)).toBe('jobs/new_job/esql_advanced?_g=()');
  });
});

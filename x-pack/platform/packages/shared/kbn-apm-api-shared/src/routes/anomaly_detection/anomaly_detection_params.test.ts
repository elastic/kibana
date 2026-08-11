/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseSuccess } from '@kbn/zod-helpers/v4';
import { createAnomalyDetectionJobsRoute } from './create_anomaly_detection_jobs';

describe('createAnomalyDetectionJobsRoute params', () => {
  it('accepts a list of environments', () => {
    const result = createAnomalyDetectionJobsRoute.params!.safeParse({
      body: { environments: ['production', 'ENVIRONMENT_ALL'] },
    });

    expectParseSuccess(result);
  });
});

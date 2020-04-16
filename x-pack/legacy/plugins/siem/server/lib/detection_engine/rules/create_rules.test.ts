/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../../../plugins/alerting/server/mocks';
import { actionsClientMock } from '../../../../../../../plugins/actions/server/mocks';
import { getMlResult } from '../routes/__mocks__/request_responses';
import { createRules } from './create_rules';

describe('createRules', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let alertsClient: ReturnType<typeof alertsClientMock.create>;

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    alertsClient = alertsClientMock.create();
  });

  it('calls the alertsClient with ML params', async () => {
    const params = {
      ...getMlResult().params,
      anomalyThreshold: 55,
      machineLearningJobId: 'new_job_id',
    };

    await createRules({
      alertsClient,
      actionsClient,
      ...params,
      ruleId: 'new-rule-id',
      enabled: true,
      interval: '',
      name: '',
      tags: [],
      actions: [],
    });

    expect(alertsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 55,
            machineLearningJobId: 'new_job_id',
          }),
        }),
      })
    );
  });
});

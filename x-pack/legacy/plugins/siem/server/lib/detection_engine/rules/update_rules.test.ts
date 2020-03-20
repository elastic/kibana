/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../../plugins/alerting/server/mocks';
import { actionsClientMock } from '../../../../../../../plugins/actions/server/mocks';
import { getMlResult } from '../routes/__mocks__/request_responses';
import { updateRules } from './update_rules';

describe('updateRules', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    alertsClient = alertsClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('calls the alertsClient with ML params', async () => {
    alertsClient.get.mockResolvedValue(getMlResult());

    const params = {
      ...getMlResult().params,
      anomalyThreshold: 55,
      machineLearningJobId: 'new_job_id',
    };

    await updateRules({
      alertsClient,
      actionsClient,
      actions: [],
      savedObjectsClient,
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      ...params,
      enabled: true,
      throttle: null,
      interval: '',
      name: '',
      tags: [],
    });

    expect(alertsClient.update).toHaveBeenCalledWith(
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';

describe('bulkCreateAlertActions', () => {
  const mockHttp = httpServiceMock.createStartContract();

  it('POSTs to the bulk endpoint with JSON body and returns the bulk response', async () => {
    mockHttp.post.mockResolvedValue({ affected_count: 2, errors: [] });
    const result = await bulkCreateAlertActions(mockHttp, [
      { group_hash: 'g1', action_type: 'snooze', expiry: 'e' } as any,
    ]);
    expect(mockHttp.post).toHaveBeenCalledWith(`${ALERTING_V2_ALERT_API_PATH}/_bulk_action`, {
      body: JSON.stringify([{ group_hash: 'g1', action_type: 'snooze', expiry: 'e' }]),
    });
    expect(result).toEqual({ affected_count: 2, errors: [] });
  });
});

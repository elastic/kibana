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

  it('POSTs to the bulk endpoint with JSON body and returns { processed, total }', async () => {
    mockHttp.post.mockResolvedValue({ processed: 2, total: 2 });
    const result = await bulkCreateAlertActions(mockHttp, [
      { group_hash: 'g1', action_type: 'snooze', expiry: 'e' } as any,
    ]);
    expect(mockHttp.post).toHaveBeenCalledWith(`${ALERTING_V2_ALERT_API_PATH}/action/_bulk`, {
      body: JSON.stringify([{ group_hash: 'g1', action_type: 'snooze', expiry: 'e' }]),
    });
    expect(result).toEqual({ processed: 2, total: 2 });
  });
});

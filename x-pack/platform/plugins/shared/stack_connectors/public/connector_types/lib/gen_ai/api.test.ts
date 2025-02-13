/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { getDashboard } from './api';
import { SUB_ACTION } from '../../../../common/openai/constants';
const response = {
  available: true,
};

describe('Gen AI Dashboard API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());
  describe('getDashboard', () => {
    test('should call get dashboard API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(response);
      const res = await getDashboard({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
        dashboardId: 'cool-dashboard',
      });

      expect(res).toEqual(response);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: `{"params":{"subAction":"${SUB_ACTION.DASHBOARD}","subActionParams":{"dashboardId":"cool-dashboard"}}}`,
        signal: abortCtrl.signal,
      });
    });
  });
});

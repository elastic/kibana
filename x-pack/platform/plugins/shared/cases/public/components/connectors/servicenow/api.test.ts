/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getChoices } from './api';
import { choices } from '../mock';

const choicesResponse = {
  status: 'ok',
  data: choices,
};

describe('ServiceNow API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());

  describe('getChoices', () => {
    test('should call get choices API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(choicesResponse);
      const res = await getChoices({
        http,
        signal: abortCtrl.signal,
        connectorId: 'test',
        fields: ['priority'],
      });

      expect(res).toEqual(choicesResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/test/_execute', {
        body: '{"params":{"subAction":"getChoices","subActionParams":{"fields":["priority"]}}}',
        signal: abortCtrl.signal,
      });
    });
  });
});

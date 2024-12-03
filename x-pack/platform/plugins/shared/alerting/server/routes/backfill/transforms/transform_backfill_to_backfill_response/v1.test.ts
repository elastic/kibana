/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Backfill } from '../../../../application/backfill/result/types';
import { transformBackfillToBackfillResponse } from './v1';

describe('transformBackfillToBackfillResponse', () => {
  const mockBackfillResult: Backfill = {
    id: 'abc',
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    rule: {
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      params: {},
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: { interval: '12h' },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
      id: '1',
    },
    spaceId: 'default',
    start: '2023-11-16T08:00:00.000Z',
    status: 'pending',
    schedule: [{ runAt: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' }],
  };

  describe('transformBackfillToBackfillResponse', () => {
    it('transforms backfill correctly', () => {
      const result = transformBackfillToBackfillResponse(mockBackfillResult);
      expect(result).toEqual({
        id: 'abc',
        created_at: '2024-01-30T00:00:00.000Z',
        duration: '12h',
        enabled: true,
        rule: {
          name: 'my rule name',
          tags: ['foo'],
          rule_type_id: 'myType',
          params: {},
          api_key_owner: 'user',
          api_key_created_by_user: false,
          consumer: 'myApp',
          enabled: true,
          schedule: { interval: '12h' },
          created_by: 'user',
          updated_by: 'user',
          created_at: '2019-02-12T21:01:22.479Z',
          updated_at: '2019-02-12T21:01:22.479Z',
          revision: 0,
          id: '1',
        },
        space_id: 'default',
        start: '2023-11-16T08:00:00.000Z',
        status: 'pending',
        schedule: [{ run_at: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' }],
      });
    });
  });
});

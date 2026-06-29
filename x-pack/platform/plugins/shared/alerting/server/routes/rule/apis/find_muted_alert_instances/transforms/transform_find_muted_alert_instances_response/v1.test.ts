/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMutedAlertsResult } from '../../../../../../application/rule/methods/find_muted_alerts';
import { transformFindMutedAlertInstancesResponse } from './v1';

describe('transformFindMutedAlertInstancesResponse', () => {
  it('maps pagination metadata and renames muted instance ids', () => {
    const result: FindMutedAlertsResult = {
      page: 1,
      perPage: 10,
      total: 2,
      data: [
        { id: 'rule-1', mutedInstanceIds: ['instance-1', 'instance-2'] },
        { id: 'rule-2', mutedInstanceIds: ['instance-3'] },
      ],
    };

    expect(transformFindMutedAlertInstancesResponse(result)).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        { id: 'rule-1', muted_alert_ids: ['instance-1', 'instance-2'] },
        { id: 'rule-2', muted_alert_ids: ['instance-3'] },
      ],
    });
  });

  it('defaults muted_alert_ids to an empty array when missing', () => {
    const result = {
      page: 1,
      perPage: 10,
      total: 1,
      // mutedInstanceIds intentionally omitted to exercise the `?? []` fallback
      data: [{ id: 'rule-1' }],
    } as unknown as FindMutedAlertsResult;

    expect(transformFindMutedAlertInstancesResponse(result)).toEqual({
      page: 1,
      per_page: 10,
      total: 1,
      data: [{ id: 'rule-1', muted_alert_ids: [] }],
    });
  });

  it('returns an empty data array when there are no rules', () => {
    const result: FindMutedAlertsResult = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };

    expect(transformFindMutedAlertInstancesResponse(result)).toEqual({
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeScope } from './decode_scope';

describe('decodeScope', () => {
  test('pre-MV5 document with no scope defaults v1 to enabled', () => {
    expect(decodeScope(undefined)).toEqual({ alerting: { enabled: true } });
  });

  test('pre-MV5 document with alerting filter but no alertingEnabled flag', () => {
    expect(
      decodeScope({
        alerting: { kql: "_id: '1'", filters: [], dsl: '{}' },
      })
    ).toEqual({ alerting: { enabled: true, kql: "_id: '1'", filters: [], dsl: '{}' } });
  });

  test('MV5 document with alertingEnabled: true and filter', () => {
    expect(
      decodeScope({
        alertingEnabled: true,
        alerting: { kql: "_id: '1'", filters: [], dsl: '{}' },
      })
    ).toEqual({ alerting: { enabled: true, kql: "_id: '1'", filters: [], dsl: '{}' } });
  });

  test('MV5 v2-only document with alertingEnabled: false lands in neither v1 bucket', () => {
    const scope = decodeScope({
      alertingEnabled: false,
      alerting: null,
      alertingV2: { enabled: true, kql: 'episode_id: "x"' },
    });
    expect(scope).toEqual({
      alerting: { enabled: false },
      alertingV2: { enabled: true, kql: 'episode_id: "x"' },
    });
    expect(scope.alerting?.enabled).toBe(false);
  });

  test('empty alerting filter (MV4 bug) is treated as no filter', () => {
    expect(
      decodeScope({
        alertingEnabled: true,
        alerting: { kql: '', filters: [], dsl: '' },
      })
    ).toEqual({ alerting: { enabled: true } });
  });

  test('alerting: null (unfiltered v1 in MV4) is treated as no filter', () => {
    expect(
      decodeScope({
        alerting: null,
      })
    ).toEqual({ alerting: { enabled: true } });
  });

  test('alertingV2 is included when present', () => {
    expect(
      decodeScope({
        alertingEnabled: true,
        alerting: { kql: 'test', filters: [], dsl: '{}' },
        alertingV2: { enabled: true, kql: 'episode_id: "y"' },
      })
    ).toEqual({
      alerting: { enabled: true, kql: 'test', filters: [], dsl: '{}' },
      alertingV2: { enabled: true, kql: 'episode_id: "y"' },
    });
  });

  test('alertingV2 is omitted when not present', () => {
    const result = decodeScope({ alertingEnabled: true, alerting: null });
    expect(result).not.toHaveProperty('alertingV2');
  });
});

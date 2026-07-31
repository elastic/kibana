/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValueByDottedPath } from './alert_events_client';

describe('getValueByDottedPath', () => {
  const event = {
    source: 'datadog',
    rule_id: 'mon-1',
    data: {
      monitor_id: '55501',
      scope: 'host:web-01',
      labels: { env: 'prod' },
    },
  };

  it('reads declared top-level keys', () => {
    expect(getValueByDottedPath(event, 'rule_id')).toBe('mon-1');
    expect(getValueByDottedPath(event, 'source')).toBe('datadog');
  });

  it('reads explicit data.* paths (Keep-style)', () => {
    expect(getValueByDottedPath(event, 'data.monitor_id')).toBe('55501');
    expect(getValueByDottedPath(event, 'data.scope')).toBe('host:web-01');
    expect(getValueByDottedPath(event, 'data.labels.env')).toBe('prod');
  });

  it('does not magically resolve bare names into data', () => {
    expect(getValueByDottedPath(event, 'monitor_id')).toBeUndefined();
    expect(getValueByDottedPath(event, 'scope')).toBeUndefined();
  });

  it('returns undefined for missing paths', () => {
    expect(getValueByDottedPath(event, 'data.missing')).toBeUndefined();
    expect(getValueByDottedPath(event, '')).toBeUndefined();
  });
});

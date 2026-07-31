/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValueByDottedPath } from './alert_events_client';

describe('getValueByDottedPath', () => {
  const data = {
    monitor_id: '55501',
    scope: 'host:web-01',
    labels: { env: 'prod' },
  };

  it('reads bare keys under data', () => {
    expect(getValueByDottedPath(data, 'monitor_id')).toBe('55501');
    expect(getValueByDottedPath(data, 'scope')).toBe('host:web-01');
  });

  it('reads nested dotted paths under data', () => {
    expect(getValueByDottedPath(data, 'labels.env')).toBe('prod');
  });

  it('returns undefined for missing paths', () => {
    expect(getValueByDottedPath(data, 'missing')).toBeUndefined();
    expect(getValueByDottedPath(data, 'labels.missing')).toBeUndefined();
    expect(getValueByDottedPath(data, '')).toBeUndefined();
  });

  it('does not treat a data. prefix as special — that walks nested data.data', () => {
    expect(getValueByDottedPath(data, 'data.monitor_id')).toBeUndefined();
  });
});

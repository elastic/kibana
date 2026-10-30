/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStatusKeyField, setCustomStatusesEnabled } from './custom_statuses';

describe('getStatusKeyField', () => {
  afterEach(() => setCustomStatusesEnabled(false));

  it('always includes the key while custom statuses are on', () => {
    setCustomStatusesEnabled(true);
    expect(getStatusKeyField(undefined)).toEqual({ status_key: null });
    expect(getStatusKeyField('triage')).toEqual({ status_key: 'triage' });
  });

  it('leaves the field out while custom statuses are off, unless a key was stored', () => {
    expect(getStatusKeyField(null)).toEqual({});
    expect(getStatusKeyField(undefined)).toEqual({});
    expect(getStatusKeyField('triage')).toEqual({ status_key: 'triage' });
  });
});

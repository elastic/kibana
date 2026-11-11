/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomObservableTypes, toStoredObservableTypes } from './resolve_observable_types';

const builtinOverride = {
  key: 'observable-type-agent-id',
  label: 'Agent id',
  paths: [{ path: 'agent.id', enabled: false }],
};
const customType = {
  key: 'employee-id',
  label: 'Employee ID',
  paths: [{ path: 'user.employee_id', enabled: true }],
};

describe('getCustomObservableTypes', () => {
  it('removes the overrides of built-in types', () => {
    expect(getCustomObservableTypes([builtinOverride, customType])).toEqual([customType]);
  });

  it('returns an empty list when there are no types', () => {
    expect(getCustomObservableTypes([])).toEqual([]);
  });
});

describe('toStoredObservableTypes', () => {
  it('removes the label from the overrides of built-in types only', () => {
    expect(toStoredObservableTypes([builtinOverride, customType])).toEqual([
      { key: 'observable-type-agent-id', paths: [{ path: 'agent.id', enabled: false }] },
      customType,
    ]);
  });
});

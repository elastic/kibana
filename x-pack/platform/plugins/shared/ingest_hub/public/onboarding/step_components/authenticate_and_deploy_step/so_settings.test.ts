/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSOSettings, toSOSettingsUpdate } from './so_settings';

describe('toSOSettings', () => {
  it('returns the trimmed name and description', () => {
    expect(toSOSettings({ integrationName: ' my-aws ', description: ' Production ' })).toEqual({
      integrationName: 'my-aws',
      description: 'Production',
    });
  });

  it('leaves out fields that are missing or blank', () => {
    expect(toSOSettings({ integrationName: '  ', description: '' })).toEqual({});
    expect(toSOSettings(undefined)).toEqual({});
    expect(toSOSettings(null)).toEqual({});
  });
});

describe('toSOSettingsUpdate', () => {
  it('returns the trimmed name and description', () => {
    expect(
      toSOSettingsUpdate({ integrationName: ' my-aws ', description: ' Production ' })
    ).toEqual({
      integrationName: 'my-aws',
      description: 'Production',
    });
  });

  it('sends null for a blank description so a cleared one is removed from the record', () => {
    expect(toSOSettingsUpdate({ integrationName: 'my-aws', description: '  ' })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
    expect(toSOSettingsUpdate({ integrationName: 'my-aws' })).toEqual({
      integrationName: 'my-aws',
      description: null,
    });
  });

  it('never sends a blank name', () => {
    expect(toSOSettingsUpdate({ integrationName: ' ', description: 'x' })).toEqual({
      description: 'x',
    });
  });
});

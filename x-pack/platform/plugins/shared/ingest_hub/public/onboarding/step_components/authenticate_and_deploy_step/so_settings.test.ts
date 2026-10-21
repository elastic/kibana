/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSOSettings } from './so_settings';

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

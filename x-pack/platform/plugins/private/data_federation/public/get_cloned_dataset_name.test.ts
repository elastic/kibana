/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClonedDatasetName } from './get_cloned_dataset_name';

describe('getClonedDatasetName', () => {
  it('appends -copy when that name is unused', () => {
    expect(getClonedDatasetName('logs', ['logs'])).toBe('logs-copy');
  });

  it('increments the copy suffix until the name is unique', () => {
    expect(getClonedDatasetName('logs', ['logs', 'logs-copy', 'logs-copy-2'])).toBe('logs-copy-3');
  });
});

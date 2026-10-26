/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCopyName } from './copy_name';

describe('getCopyName', () => {
  it('adds a copy suffix', () => {
    expect(getCopyName('catalogs', ['catalogs'])).toBe('catalogs-copy');
  });

  it('numbers copies until the name is unused', () => {
    expect(getCopyName('catalogs', ['catalogs', 'catalogs-copy', 'catalogs-copy-2'])).toBe(
      'catalogs-copy-3'
    );
  });

  it('drops the _ prefix from copies of Elastic-managed names', () => {
    expect(getCopyName('_performant', [])).toBe('performant-copy');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from './style';

describe('truncate', () => {
  it('appends "px" when width is a number', () => {
    const result = truncate(100);

    expect(result).toContain('max-width: 100px;');
  });

  it('uses the width as-is when it is a string', () => {
    const result = truncate('50%');

    expect(result).toContain('max-width: 50%;');
  });

  it('includes the expected truncation styles', () => {
    const result = truncate(100);

    expect(result).toContain('white-space: nowrap;');
    expect(result).toContain('overflow: hidden;');
    expect(result).toContain('text-overflow: ellipsis;');
  });
});

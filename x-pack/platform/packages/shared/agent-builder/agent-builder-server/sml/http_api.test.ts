/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlSearchFilterType } from './http_api';
import type { SmlSearchFilters, SmlSearchConstraints } from './http_api';

describe('SML http_api types', () => {
  it('exposes SmlSearchFilterType.connector', () => {
    expect(SmlSearchFilterType.connector).toBeDefined();
  });

  it('SmlSearchFilters accepts types/tags', () => {
    const filters: SmlSearchFilters = { types: ['dashboard'], tags: ['prod'] };
    expect(filters.types).toEqual(['dashboard']);
  });

  it('SmlSearchConstraints accepts a connector id allowlist', () => {
    const constraints: SmlSearchConstraints = {
      [SmlSearchFilterType.connector]: { ids: ['conn-1'] },
    };
    expect(constraints[SmlSearchFilterType.connector]?.ids).toEqual(['conn-1']);
  });
});

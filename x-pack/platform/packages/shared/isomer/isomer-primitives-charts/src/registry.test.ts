/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHART_TYPES } from './charts/define';
import { registryTypes } from './registry.fixtures';

describe('registry', () => {
  it('is sorted', () => {
    expect(registryTypes).toEqual([...registryTypes].sort());
    expect([...CHART_TYPES]).toEqual([...CHART_TYPES].sort());
  });

  it('registers only chart types `CHART_TYPES` names', () => {
    for (const type of registryTypes) {
      expect(CHART_TYPES).toContain(type);
    }
  });
});

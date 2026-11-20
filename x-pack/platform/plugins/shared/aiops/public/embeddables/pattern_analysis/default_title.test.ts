/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPatternAnalysisDefaultTitle } from './default_title';

describe('pattern analysis panel titles', () => {
  it('uses the log pattern analysis page title when no field is selected', () => {
    expect(getPatternAnalysisDefaultTitle()).toBe('Log pattern analysis');
    expect(getPatternAnalysisDefaultTitle('')).toBe('Log pattern analysis');
  });

  it('includes the analyzed field when one is selected', () => {
    expect(getPatternAnalysisDefaultTitle('message')).toBe('Pattern analysis: message');
  });
});

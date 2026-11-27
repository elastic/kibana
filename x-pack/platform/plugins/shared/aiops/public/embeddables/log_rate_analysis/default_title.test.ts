/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLogRateAnalysisDefaultTitle } from './default_title';

describe('getLogRateAnalysisDefaultTitle', () => {
  it('uses the same default title as the log rate analysis page', () => {
    expect(getLogRateAnalysisDefaultTitle()).toBe('Log rate analysis');
  });
});

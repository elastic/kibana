/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchesIndexPattern } from './matches_index_pattern';

describe('matchesIndexPattern', () => {
  it('matches a static name and glob wildcards', () => {
    expect(matchesIndexPattern('logs-app-default', 'logs-app-default')).toBe(true);
    expect(matchesIndexPattern('logs-nginx-default', 'logs-*-*')).toBe(true);
    expect(matchesIndexPattern('metrics-app-default', 'logs-*-*')).toBe(false);
    expect(matchesIndexPattern('logs-a-default', 'logs-?-default')).toBe(true);
    expect(matchesIndexPattern('logs-ab-default', 'logs-?-default')).toBe(false);
  });
});

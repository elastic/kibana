/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_SOURCE_VIEW_PREFIX,
  getNightshiftSourceIdFromViewName,
  getNightshiftSourceViewName,
} from './view_name';

describe('source view names', () => {
  it('prefixes the source id with the Nightshift view namespace', () => {
    expect(getNightshiftSourceViewName('abc-123')).toBe('$.nightshift.sources.abc-123');
    expect(getNightshiftSourceViewName('abc-123').startsWith(NIGHTSHIFT_SOURCE_VIEW_PREFIX)).toBe(
      true
    );
  });

  it('round-trips a view name back to the source id', () => {
    expect(getNightshiftSourceIdFromViewName(getNightshiftSourceViewName('abc-123'))).toBe(
      'abc-123'
    );
  });

  it('returns undefined for view names outside the namespace', () => {
    expect(getNightshiftSourceIdFromViewName('$.logs.otel')).toBeUndefined();
    expect(getNightshiftSourceIdFromViewName('logs-*')).toBeUndefined();
  });
});

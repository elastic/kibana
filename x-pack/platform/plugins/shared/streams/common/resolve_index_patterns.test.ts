/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectResolvedDataStreamNames,
  collectResolvedIndexNames,
} from './resolve_index_patterns';

describe('collectResolvedIndexNames', () => {
  it('returns sorted data stream names and skips hidden backing indices', () => {
    expect(
      collectResolvedIndexNames({
        data_streams: [
          { name: 'logs-application.otel-prod' },
          { name: 'logs-application.otel-dev' },
        ],
        indices: [
          { name: '.ds-logs-application.otel-dev-2026.10.13-000001' },
          { name: 'custom-logs' },
        ],
      })
    ).toEqual(['custom-logs', 'logs-application.otel-dev', 'logs-application.otel-prod']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(collectResolvedIndexNames({})).toEqual([]);
  });

  it('returns only data stream names', () => {
    expect(
      collectResolvedDataStreamNames({
        data_streams: [{ name: 'logs-nginx-default' }],
        indices: [{ name: 'logs-regular' }],
      })
    ).toEqual(['logs-nginx-default']);
  });
});

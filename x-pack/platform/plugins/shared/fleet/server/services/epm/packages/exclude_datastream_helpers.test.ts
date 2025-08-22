/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldIncludePackageWithDatastreamTypes } from './exclude_datastreams_helper';

describe('shouldIncludePackageWithDatastreamTypes', () => {
  it('should not exclude package without datastreams', () => {
    const pkg = {
      id: 'test.package',
      data_streams: [],
    };
    const excludeDataStreamTypes = ['metrics'];
    const result = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
    expect(result).toBe(true);
  });

  it('should not exclude package with excluded and non excluded datastreams type', () => {
    const pkg = {
      id: 'test.package',
      data_streams: [{ type: 'logs' }, { type: 'metrics' }],
    };
    const excludeDataStreamTypes = ['metrics'];
    const result = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
    expect(result).toBe(true);
  });

  it('should exclude package with only excluded datastreams type', () => {
    const pkg = {
      id: 'test.package',
      data_streams: [{ type: 'metrics' }],
    };
    const excludeDataStreamTypes = ['metrics'];
    const result = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
    expect(result).toBe(false);
  });
});

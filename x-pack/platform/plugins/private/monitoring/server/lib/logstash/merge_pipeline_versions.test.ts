/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergePipelineVersions } from './merge_pipeline_versions';

describe('merge_pipeline_versions', () => {
  it('merges duplicates', () => {
    const versions = [
      { hash: 'foo', firstSeen: 1, lastSeen: 2 },
      { hash: 'bar', firstSeen: 5, lastSeen: 10 },
      { hash: 'foo', firstSeen: 3, lastSeen: 4 },
      { hash: 'bar', firstSeen: 1, lastSeen: 3 },
    ];

    const result = mergePipelineVersions(versions);

    expect(result.length).toEqual(2);
    expect(result.find((v) => v.hash === 'foo')).toEqual({
      hash: 'foo',
      firstSeen: 1,
      lastSeen: 4,
    });
    expect(result.find((v) => v.hash === 'bar')).toEqual({
      hash: 'bar',
      firstSeen: 1,
      lastSeen: 10,
    });
  });

  it('is a noop when no duplicates', () => {
    const versions = [
      { hash: 'foo', firstSeen: 1, lastSeen: 2 },
      { hash: 'bar', firstSeen: 5, lastSeen: 10 },
    ];

    const result = mergePipelineVersions(versions);

    expect(result.length).toEqual(2);
    expect(result.find((v) => v.hash === 'foo')).toEqual({
      hash: 'foo',
      firstSeen: 1,
      lastSeen: 2,
    });
    expect(result.find((v) => v.hash === 'bar')).toEqual({
      hash: 'bar',
      firstSeen: 5,
      lastSeen: 10,
    });
  });
});

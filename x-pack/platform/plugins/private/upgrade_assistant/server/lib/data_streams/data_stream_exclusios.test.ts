/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchExclusionPattern } from './data_stream_exclusions';
import { DataStreamExclusions } from '../../../common/types';

describe('matchExclusionPattern', () => {
  it('should return the actions that should be excluded', () => {
    const exclusions: DataStreamExclusions = {
      data_stream_1: ['readOnly'],
    };

    const result = matchExclusionPattern('data_stream_1', exclusions);
    expect(result).toEqual(['readOnly']);
  });

  it('should return an empty array if no exclusions match', () => {
    const exclusions: DataStreamExclusions = {
      data_stream_1: ['readOnly'],
    };

    const result = matchExclusionPattern('data_stream_2', exclusions);
    expect(result).toEqual([]);
  });

  it(`should match patterns ending with '*'`, () => {
    const exclusions: DataStreamExclusions = {
      'data_stream_*': ['readOnly'],
    };

    const result = matchExclusionPattern('data_stream_1', exclusions);
    expect(result).toEqual(['readOnly']);
  });
});

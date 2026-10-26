/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformHealthRuleParamsSchema } from './v1';

describe('transformHealthRuleParamsSchema', () => {
  const validParams = {
    includeTransforms: ['*'],
    excludeTransforms: ['exclude_transform_*'],
    testsConfig: null,
  };

  it('validates valid params', () => {
    expect(() => transformHealthRuleParamsSchema.validate(validParams)).not.toThrow();
  });

  it('validates entries and arrays at exactly the max size', () => {
    expect(() =>
      transformHealthRuleParamsSchema.validate({
        ...validParams,
        includeTransforms: Array.from({ length: 1000 }, (_, i) => `transform-${i}`),
        excludeTransforms: ['a'.repeat(1000)],
      })
    ).not.toThrow();
  });

  it('throws when an includeTransforms entry exceeds the max length', () => {
    expect(() =>
      transformHealthRuleParamsSchema.validate({
        ...validParams,
        includeTransforms: ['a'.repeat(1001)],
      })
    ).toThrow(
      '[includeTransforms.0]: value has length [1001] but it must have a maximum length of [1000].'
    );
  });

  it('throws when includeTransforms has too many entries', () => {
    expect(() =>
      transformHealthRuleParamsSchema.validate({
        ...validParams,
        includeTransforms: Array.from({ length: 1001 }, (_, i) => `transform-${i}`),
      })
    ).toThrow('[includeTransforms]: array size is [1001], but cannot be greater than [1000]');
  });

  it('throws when an excludeTransforms entry exceeds the max length', () => {
    expect(() =>
      transformHealthRuleParamsSchema.validate({
        ...validParams,
        excludeTransforms: ['a'.repeat(1001)],
      })
    ).toThrow(
      '[excludeTransforms.0.0]: value has length [1001] but it must have a maximum length of [1000].'
    );
  });

  it('throws when excludeTransforms has too many entries', () => {
    expect(() =>
      transformHealthRuleParamsSchema.validate({
        ...validParams,
        excludeTransforms: Array.from({ length: 1001 }, (_, i) => `transform-${i}`),
      })
    ).toThrow('[excludeTransforms.0]: array size is [1001], but cannot be greater than [1000]');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedPolicy } from '../../../common/types';
import { defaultRolloverAction } from '../constants';
import { isUsingDefaultRollover } from './rollover';

const createPolicyWithRollover = (
  rollover: NonNullable<SerializedPolicy['phases']['hot']>['actions']['rollover']
): SerializedPolicy => ({
  name: 'test-policy',
  phases: {
    hot: {
      actions: {
        rollover,
      },
    },
  },
});

describe('isUsingDefaultRollover', () => {
  it('returns false when rollover is not configured', () => {
    const policy: SerializedPolicy = {
      name: 'test-policy',
      phases: {
        hot: {
          actions: {},
        },
      },
    };

    expect(isUsingDefaultRollover(policy)).toBe(false);
  });

  it('returns true when rollover matches defaults 1:1', () => {
    expect(isUsingDefaultRollover(createPolicyWithRollover({ ...defaultRolloverAction }))).toBe(
      true
    );
  });

  it('returns false when a default key is missing', () => {
    const policy = createPolicyWithRollover({
      max_age: defaultRolloverAction.max_age,
    });

    expect(isUsingDefaultRollover(policy)).toBe(false);
  });

  it('returns false when a default value differs', () => {
    const policy = createPolicyWithRollover({
      ...defaultRolloverAction,
      max_age: '29d',
    });

    expect(isUsingDefaultRollover(policy)).toBe(false);
  });

  it('returns false when extra max_* threshold keys exist', () => {
    const policy = createPolicyWithRollover({
      ...defaultRolloverAction,
      max_docs: 1000,
    });

    expect(isUsingDefaultRollover(policy)).toBe(false);
  });

  it('returns false when extra min_* threshold keys exist', () => {
    const policy = createPolicyWithRollover({
      ...defaultRolloverAction,
      min_age: '1d',
    });

    expect(isUsingDefaultRollover(policy)).toBe(false);
  });

  it('returns false when an unknown key exists', () => {
    const policy = createPolicyWithRollover({
      ...defaultRolloverAction,
      // @ts-expect-error testing extra unknown keys
      unknown_setting: 123,
    });

    expect(isUsingDefaultRollover(policy)).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeTypeChanges } from './describe_type_changes';

describe('describeTypeChanges', () => {
  const override = (name: string, type: string, originalType: string) => ({
    name,
    type,
    original_type: originalType,
  });

  it('describes new, retyped, and reverted overrides', () => {
    expect(
      describeTypeChanges(
        [override('a', 'long', 'keyword'), override('b', 'double', 'long')],
        [override('a', 'ip', 'keyword'), override('c', 'keyword', 'long')]
      )
    ).toEqual(['long:ip', 'long:keyword', 'double:long']);
  });

  it('ignores unchanged overrides and fields the pipeline no longer produces', () => {
    expect(
      describeTypeChanges(
        [override('a', 'long', 'keyword'), override('gone', 'long', 'keyword')],
        [override('a', 'long', 'keyword')],
        ['gone']
      )
    ).toEqual([]);
  });
});

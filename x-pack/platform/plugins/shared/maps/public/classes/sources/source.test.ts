/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnSourceChangeArgs, SourcePropName } from './source';

/*
 * These are type-level tests. Jest does not type check, so the assertions are enforced by
 * `node scripts/type_check`. A `@ts-expect-error` line fails the type check if it stops erroring.
 */
describe('OnSourceChangeArgs', () => {
  test('should flag unknown property names as type errors', () => {
    // @ts-expect-error not a property of any source descriptor
    const unknownProp: SourcePropName = 'definitelyNotAKey';

    // @ts-expect-error not a property of any source descriptor
    const unknownChange: OnSourceChangeArgs = { propName: 'notASourceProp', value: [] };

    expect([unknownProp, unknownChange]).toHaveLength(2);
  });

  test('should flag property names that are not in the source descriptor', () => {
    const sourceChange = (change: OnSourceChangeArgs<{ mode: string }>) => change;
    expect(sourceChange({ propName: 'mode', value: 'fast' })).toBeDefined();
    // @ts-expect-error notASourceProp is not a key of the source descriptor
    expect(sourceChange({ propName: 'notASourceProp', value: '' })).toBeDefined();
  });
});

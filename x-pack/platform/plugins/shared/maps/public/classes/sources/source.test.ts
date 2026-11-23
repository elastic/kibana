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
describe('SourcePropName', () => {
  test('should accept property names from any source descriptor', () => {
    const changes: OnSourceChangeArgs[] = [
      { propName: 'esql', value: 'FROM logs' }, // ES|QL only
      { propName: 'tooltipProperties', value: [] }, // EMS file, ES search, MVT
      { propName: 'metrics', value: [] }, // ES geo grid, geo line, pew pew
      { propName: 'urlTemplate', value: '' }, // XYZ TMS
    ];
    expect(changes).toHaveLength(4);
  });

  test('should flag unknown property names as type errors', () => {
    // @ts-expect-error not a property of any source descriptor
    const unknownProp: SourcePropName = 'definitelyNotAKey';

    // @ts-expect-error not a property of any source descriptor
    const unknownChange: OnSourceChangeArgs = { propName: 'notASourceProp', value: [] };

    expect([unknownProp, unknownChange]).toHaveLength(2);
  });

  test('should not widen to string', () => {
    // If the loose catch-all member of SourceDescriptor leaks in, keyof widens to string and the
    // checks above silently stop working.
    const isWide: string extends SourcePropName ? true : false = false;
    expect(isWide).toBe(false);
  });
});

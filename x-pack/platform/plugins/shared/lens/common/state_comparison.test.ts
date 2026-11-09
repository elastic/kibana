/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { areComparatorsEqual, type SerializedStateComparison } from '@kbn/presentation-publishing';
import { lensStateComparison } from './state_comparison';

type LensComparedState = typeof lensStateComparison extends SerializedStateComparison<infer State>
  ? State
  : never;

const compareAttributes = lensStateComparison.comparators.attributes;
if (typeof compareAttributes !== 'function') {
  throw new Error('Expected Lens to compare attributes with a custom comparator');
}

describe('lensStateComparison', () => {
  describe('attributes comparator', () => {
    // Converting from the API format leaves keys set to `undefined` (e.g. a gauge without a goal
    // has `goalAccessor: undefined`). Those keys are dropped when the state is saved as JSON.
    const attributes = new LensConfigBuilder(undefined, true).fromAPIFormat({
      type: 'gauge',
      title: 'Requests',
      data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
      metric: { column: 'count' },
      sampling: 1,
      ignore_global_filters: false,
    });
    const savedAttributes = JSON.parse(JSON.stringify(attributes));

    test('treats attributes that only differ by undefined keys as equal', () => {
      expect(compareAttributes(savedAttributes, attributes)).toBe(true);
    });

    test('detects a changed attribute', () => {
      expect(compareAttributes(savedAttributes, { ...attributes, title: 'Errors' })).toBe(false);
    });

    test('detects saving a by-value panel to the library from the editor', () => {
      expect(
        compareAttributes(
          savedAttributes,
          undefined,
          { attributes: savedAttributes },
          { ref_id: '1' }
        )
      ).toBe(false);
    });

    test('ignores attributes when both states are by reference', () => {
      expect(compareAttributes(undefined, undefined, { ref_id: '1' }, { ref_id: '1' })).toBe(true);
    });
  });

  describe('overrides comparator', () => {
    const withOverrides = (overrides: unknown) => ({ ref_id: '1', overrides } as LensComparedState);
    const areEqual = (last: LensComparedState, current: LensComparedState) =>
      areComparatorsEqual(lensStateComparison.comparators, last, current);
    const buildOverrides = (legendSize: number) => ({
      settings: { legendSize, theme: { background: { visible: false } } },
    });

    test('treats separately built overrides with equal content as equal', () => {
      expect(areEqual(withOverrides(buildOverrides(10)), withOverrides(buildOverrides(10)))).toBe(
        true
      );
    });

    test('detects a changed nested override', () => {
      expect(areEqual(withOverrides(buildOverrides(10)), withOverrides(buildOverrides(20)))).toBe(
        false
      );
    });
  });
});

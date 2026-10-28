/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensSerializedState } from '@kbn/lens-common';
import { getLensInternalApiMock, getLensRuntimeStateMock } from '../mocks';
import { initializeStateManagement } from './initialize_state_management';

const getAttributesComparator = (attributes: LensSerializedState['attributes']) => {
  const { getComparators } = initializeStateManagement(
    getLensRuntimeStateMock({ attributes }),
    getLensInternalApiMock()
  );
  const comparator = getComparators().attributes;
  if (typeof comparator !== 'function') {
    throw new Error('Expected a by-value Lens panel to compare its attributes');
  }
  return comparator;
};

describe('initializeStateManagement', () => {
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
      const compareAttributes = getAttributesComparator(attributes);

      expect(compareAttributes(savedAttributes, attributes)).toBe(true);
    });

    test('detects a changed attribute', () => {
      const compareAttributes = getAttributesComparator(attributes);

      expect(compareAttributes(savedAttributes, { ...attributes, title: 'Errors' })).toBe(false);
    });
  });
});

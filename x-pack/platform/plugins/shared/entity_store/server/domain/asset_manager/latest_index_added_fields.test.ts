/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LATEST_INDEX_MAPPINGS_VERSION } from '../../../common/domain/entity_index';
import { LATEST_INDEX_ADDED_FIELDS } from '../../../common/domain/latest_index_added_fields';
import { getLatestIndexMappingProperties } from './latest_index_mappings';

describe('LATEST_INDEX_ADDED_FIELDS', () => {
  const properties = getLatestIndexMappingProperties('default');

  it.each(LATEST_INDEX_ADDED_FIELDS.map(({ field }) => field))(
    'maps %s as keyword in the latest index mappings',
    (field) => {
      expect(properties[field]).toMatchObject({ type: 'keyword' });
    }
  );

  it.each(LATEST_INDEX_ADDED_FIELDS)(
    'lists $field with a version that exists, not above the current mappings version',
    ({ version }) => {
      expect(Number.isInteger(version)).toBe(true);
      expect(version).toBeGreaterThanOrEqual(1);
      expect(version).toBeLessThanOrEqual(LATEST_INDEX_MAPPINGS_VERSION);
    }
  );

  it('lists each field once', () => {
    const fields = LATEST_INDEX_ADDED_FIELDS.map(({ field }) => field);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

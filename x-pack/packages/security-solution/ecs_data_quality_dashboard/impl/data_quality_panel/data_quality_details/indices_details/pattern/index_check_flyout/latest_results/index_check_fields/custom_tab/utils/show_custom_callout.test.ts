/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { someField } from '../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { showCustomCallout } from './show_custom_callout';

describe('showCustomCallout', () => {
  test('it returns false when `enrichedFieldMetadata` is empty', () => {
    expect(showCustomCallout([])).toBe(false);
  });

  test('it returns true when `enrichedFieldMetadata` is NOT empty', () => {
    expect(showCustomCallout([someField])).toBe(true);
  });
});

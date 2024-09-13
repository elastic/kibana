/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIncompatibleMappingsFields,
  getIncompatibleValuesFields,
  showInvalidCallout,
} from './helpers';
import { mockPartitionedFieldMetadata } from '../../../../../../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';

describe('helpers', () => {
  describe('showInvalidCallout', () => {
    test('it returns false when the `enrichedFieldMetadata` is empty', () => {
      expect(showInvalidCallout([])).toBe(false);
    });

    test('it returns true when the `enrichedFieldMetadata` is NOT empty', () => {
      expect(showInvalidCallout(mockPartitionedFieldMetadata.incompatible)).toBe(true);
    });
  });

  describe('getIncompatibleMappingsFields', () => {
    test('it (only) returns the fields where type !== indexFieldType', () => {
      expect(getIncompatibleMappingsFields(mockPartitionedFieldMetadata.incompatible)).toEqual([
        'host.name',
        'source.ip',
      ]);
    });

    test('it filters-out ECS complaint fields', () => {
      expect(getIncompatibleMappingsFields(mockPartitionedFieldMetadata.ecsCompliant)).toEqual([]);
    });
  });

  describe('getIncompatibleValuesFields', () => {
    test('it (only) returns the fields with indexInvalidValues', () => {
      expect(getIncompatibleValuesFields(mockPartitionedFieldMetadata.incompatible)).toEqual([
        'event.category',
      ]);
    });

    test('it filters-out ECS complaint fields', () => {
      expect(getIncompatibleValuesFields(mockPartitionedFieldMetadata.ecsCompliant)).toEqual([]);
    });
  });
});

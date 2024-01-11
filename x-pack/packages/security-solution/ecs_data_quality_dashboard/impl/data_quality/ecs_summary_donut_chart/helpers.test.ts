/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allMetadataIsEmpty } from './helpers';
import { mockPartitionedFieldMetadata } from '../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { PartitionedFieldMetadata } from '../types';

describe('helpers', () => {
  describe('allMetadataIsEmpty', () => {
    test('it returns false when `all` is NOT is empty', () => {
      expect(allMetadataIsEmpty(mockPartitionedFieldMetadata)).toBe(false);
    });

    test('it returns true when `all` is is empty', () => {
      const allIsEmpty: PartitionedFieldMetadata = {
        all: [], // <-- empty
        custom: [],
        ecsCompliant: [],
        incompatible: [],
        sameFamily: [],
      };

      expect(allMetadataIsEmpty(allIsEmpty)).toBe(true);
    });
  });
});

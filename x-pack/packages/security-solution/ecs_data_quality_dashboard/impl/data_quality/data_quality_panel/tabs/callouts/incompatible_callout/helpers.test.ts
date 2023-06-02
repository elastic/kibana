/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIncompatiableFieldsInSameFamilyCount } from './helpers';
import {
  eventCategory,
  eventCategoryWithUnallowedValues,
  hostNameWithTextMapping,
  someField,
  sourceIpWithTextMapping,
} from '../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { EnrichedFieldMetadata } from '../../../../types';

const sameFamily: EnrichedFieldMetadata = {
  ...eventCategory, // `event.category` is a `keyword` per the ECS spec
  indexFieldType: 'wildcard', // this index has a mapping of `wildcard` instead of `keyword`
  isInSameFamily: true, // `wildcard` and `keyword` are in the same family
  isEcsCompliant: false, // wildcard !== keyword
};

describe('helpers', () => {
  describe('getFieldsInSameFamilyCount', () => {
    test('it filters out fields that are ECS compliant', () => {
      expect(
        getIncompatiableFieldsInSameFamilyCount([
          eventCategory, // isEcsCompliant: true, indexInvalidValues.length: 0, isInSameFamily: true, `keyword` and `keyword` are in the same family
        ])
      ).toEqual(0);
    });

    test('it filters out fields with unallowed values', () => {
      expect(
        getIncompatiableFieldsInSameFamilyCount([
          eventCategoryWithUnallowedValues, // isEcsCompliant: false, indexInvalidValues.length: 2, isInSameFamily: true, `keyword` and `keyword` are in the same family
        ])
      ).toEqual(0);
    });

    test('it filters out fields that are not in the same family', () => {
      expect(
        getIncompatiableFieldsInSameFamilyCount([
          hostNameWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, `keyword` and `text` are not in the family
        ])
      ).toEqual(0);
    });

    test('it returns 1 for an incompatible field in the same family', () => {
      expect(
        getIncompatiableFieldsInSameFamilyCount([
          sameFamily, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: true, `wildcard` and `keyword` are in the same family
        ])
      ).toEqual(1);
    });

    test('it returns the expected count when some of the input should be counted', () => {
      expect(
        getIncompatiableFieldsInSameFamilyCount([
          sameFamily,
          eventCategoryWithUnallowedValues, //  isEcsCompliant: false, indexInvalidValues.length: 2, isInSameFamily: true, `keyword` and `keyword` are in the same family
          hostNameWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length, isInSameFamily: false, `text` and `keyword` not in the same family
          someField, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, custom fields are never in the same family
          sourceIpWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, `ip` is not a member of any families
        ])
      ).toEqual(1);
    });

    test('it returns zero when none of the input should be counted', () => {
      expect(
        getIncompatiableFieldsInSameFamilyCount([
          eventCategoryWithUnallowedValues, //  isEcsCompliant: false, indexInvalidValues.length: 2, isInSameFamily: true, `keyword` and `keyword` are in the same family
          hostNameWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length, isInSameFamily: false, `text` and `keyword` not in the same family
          someField, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, custom fields are never in the same family
          sourceIpWithTextMapping, // isEcsCompliant: false, indexInvalidValues.length: 0, isInSameFamily: false, `ip` is not a member of any families
        ])
      ).toEqual(0);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalResult } from '../../../../../../../../../types';
import { getIncompatibleAndSameFamilyFieldsFromHistoricalResult } from './get_incompatible_and_same_family_fields_from_historical_result';
import { EcsFlatTyped } from '../../../../../../../../../constants';

describe('getIncompatibleAndSameFamilyFieldsFromHistoricalResult', () => {
  it('should return incompatible and same family fields', () => {
    const historicalResult = {
      incompatibleFieldMappingItems: [
        {
          fieldName: 'host.name',
          actualValue: 'text',
        },
      ],
      incompatibleFieldValueItems: [
        {
          fieldName: 'host.name',
          actualValues: [
            {
              name: 'text',
              count: 1,
            },
          ],
        },
      ],
      sameFamilyFieldItems: [
        {
          fieldName: 'host.name',
          expectedValue: 'keyword',
        },
      ],
    } as HistoricalResult;

    const result = getIncompatibleAndSameFamilyFieldsFromHistoricalResult(historicalResult);

    expect(result).toEqual({
      incompatibleMappingsFields: [
        {
          ...EcsFlatTyped['host.name'],
          indexFieldName: 'host.name',
          indexFieldType: 'text',
          indexInvalidValues: [],
          hasEcsMetadata: true,
          isEcsCompliant: false,
          isInSameFamily: false,
        },
      ],
      incompatibleValuesFields: [
        {
          ...EcsFlatTyped['host.name'],
          indexFieldName: 'host.name',
          indexFieldType: 'keyword',
          indexInvalidValues: [
            {
              fieldName: 'text',
              count: 1,
            },
          ],
          hasEcsMetadata: true,
          isEcsCompliant: false,
          isInSameFamily: false,
        },
      ],
      sameFamilyFields: [
        {
          ...EcsFlatTyped['host.name'],
          indexFieldName: 'host.name',
          indexFieldType: 'keyword',
          indexInvalidValues: [],
          hasEcsMetadata: true,
          isEcsCompliant: false,
          isInSameFamily: true,
        },
      ],
    });
  });
});

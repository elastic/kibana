/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIncompatibleAndSameFamilyFieldsFromHistoricalResult } from './get_incompatible_and_same_family_fields_from_historical_result';
import { EcsFlatTyped } from '../../../../../../../../../constants';
import { getHistoricalResultStub } from '../../../../../../../../../stub/get_historical_result_stub';

describe('getIncompatibleAndSameFamilyFieldsFromHistoricalResult', () => {
  it('should return incompatible and same family fields', () => {
    const historicalResult = getHistoricalResultStub('test');

    const result = getIncompatibleAndSameFamilyFieldsFromHistoricalResult(historicalResult);

    expect(result).toEqual(
      expect.objectContaining({
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
      })
    );
  });
});

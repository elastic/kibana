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
    const mockHistoricalResult = getHistoricalResultStub('test');
    const historicalResult = {
      ...mockHistoricalResult,
      incompatibleFieldMappingItems: [
        {
          fieldName: 'host.name',
          expectedValue: 'keyword',
          actualValue: 'text',
          description:
            'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
        },
      ],
      unallowedMappingFields: ['host.name'],
      incompatibleFieldCount: 2,
      sameFamilyFieldCount: 1,
      sameFamilyFieldItems: [mockHistoricalResult.sameFamilyFieldItems[0]],
    };

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
            ...EcsFlatTyped['event.category'],
            indexFieldName: 'event.category',
            indexFieldType: 'keyword',
            indexInvalidValues: [
              {
                fieldName: 'siem',
                count: 110616,
              },
            ],
            hasEcsMetadata: true,
            isEcsCompliant: false,
            isInSameFamily: false,
          },
        ],
        sameFamilyFields: [
          {
            ...EcsFlatTyped['error.message'],
            indexFieldName: 'error.message',
            indexFieldType: 'match_only_text',
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

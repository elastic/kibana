/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import { mockMappingsResponse } from '../../mock/mappings_response/mock_mappings_response';
import { UseIndicesCheckCheckState } from '../../hooks/use_indices_check/types';
import { getUnallowedValues } from '../../utils/fetch_unallowed_values';
import { getUnallowedValueRequestItems } from '../../utils/get_unallowed_value_request_items';
import { EcsFlatTyped } from '../../constants';
import { mockUnallowedValuesResponse } from '../../mock/unallowed_values/mock_unallowed_values';
import { UnallowedValueSearchResult } from '../../types';
import { getMappingsProperties, getSortedPartitionedFieldMetadata } from '../../utils/metadata';

export const getCheckStateStub = (
  indexName: string,
  indexCheckState?: Partial<UseIndicesCheckCheckState['string']>
) => {
  const mappingsProperties = getMappingsProperties({
    indexName,
    indexes: mockMappingsResponse as Record<string, IndicesGetMappingIndexMappingRecord>,
  });
  const unallowedValues = getUnallowedValues({
    requestItems: getUnallowedValueRequestItems({
      ecsMetadata: EcsFlatTyped,
      indexName,
    }),
    searchResults: mockUnallowedValuesResponse as unknown as UnallowedValueSearchResult[],
  });
  const partitionedFieldMetadata = getSortedPartitionedFieldMetadata({
    ecsMetadata: EcsFlatTyped,
    loadingMappings: false,
    mappingsProperties,
    unallowedValues,
  });
  return {
    [indexName]: {
      isChecking: false,
      isLoadingMappings: false,
      isLoadingUnallowedValues: false,
      indexes: mockMappingsResponse as Record<string, IndicesGetMappingIndexMappingRecord>,
      partitionedFieldMetadata,
      searchResults: mockUnallowedValuesResponse as unknown as UnallowedValueSearchResult[],
      unallowedValues,
      mappingsProperties,
      genericError: null,
      mappingsError: null,
      unallowedValuesError: null,
      isCheckComplete: true,
      ...indexCheckState,
    },
  };
};

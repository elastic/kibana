/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { sortBy } from 'lodash/fp';
import { EcsFlatTyped } from '../../constants';

import {
  getEnrichedFieldMetadata,
  getFieldTypes,
  getMissingTimestampFieldMetadata,
  getPartitionedFieldMetadata,
} from '../../helpers';
import type { PartitionedFieldMetadata, UnallowedValueCount } from '../../types';

export const ALL_TAB_ID = 'allTab';
export const ECS_COMPLIANT_TAB_ID = 'ecsCompliantTab';
export const CUSTOM_TAB_ID = 'customTab';
export const INCOMPATIBLE_TAB_ID = 'incompatibleTab';
export const SAME_FAMILY_TAB_ID = 'sameFamilyTab';
export const SUMMARY_TAB_ID = 'summaryTab';

export const EMPTY_METADATA: PartitionedFieldMetadata = {
  all: [],
  ecsCompliant: [],
  custom: [],
  incompatible: [],
  sameFamily: [],
};

export const getSortedPartitionedFieldMetadata = ({
  ecsMetadata,
  loadingMappings,
  mappingsProperties,
  unallowedValues,
}: {
  ecsMetadata: EcsFlatTyped;
  loadingMappings: boolean;
  mappingsProperties: Record<string, MappingProperty> | null | undefined;
  unallowedValues: Record<string, UnallowedValueCount[]> | null;
}): PartitionedFieldMetadata | null => {
  if (loadingMappings || unallowedValues == null) {
    return null;
  }

  // this covers scenario when we try to check an empty index
  // or index without required @timestamp field in the mapping
  //
  // we create an artifical incompatible timestamp field metadata
  // so that we can signal to user that the incompatibility is due to missing timestamp
  if (mappingsProperties == null) {
    const missingTimestampFieldMetadata = getMissingTimestampFieldMetadata();
    return {
      ...EMPTY_METADATA,
      all: [missingTimestampFieldMetadata],
      incompatible: [missingTimestampFieldMetadata],
    };
  }

  const fieldTypes = getFieldTypes(mappingsProperties);

  const enrichedFieldMetadata = sortBy(
    'indexFieldName',
    fieldTypes.map((fieldMetadata) =>
      getEnrichedFieldMetadata({ ecsMetadata, fieldMetadata, unallowedValues })
    )
  );

  const partitionedFieldMetadata = getPartitionedFieldMetadata(enrichedFieldMetadata);

  return partitionedFieldMetadata;
};

export const getMappingsProperties = ({
  indexes,
  indexName,
}: {
  indexes: Record<string, IndicesGetMappingIndexMappingRecord> | null;
  indexName: string;
}): Record<string, MappingProperty> | null => {
  if (indexes != null && indexes[indexName] != null) {
    return indexes[indexName].mappings.properties ?? null;
  }

  return null;
};

export const hasAllDataFetchingCompleted = ({
  loadingMappings,
  loadingUnallowedValues,
}: {
  loadingMappings: boolean;
  loadingUnallowedValues: boolean;
}): boolean => loadingMappings === false && loadingUnallowedValues === false;

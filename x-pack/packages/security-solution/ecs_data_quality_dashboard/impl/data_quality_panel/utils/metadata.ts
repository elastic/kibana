/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { has, sortBy } from 'lodash/fp';

import { EMPTY_METADATA, EcsFlatTyped } from '../constants';
import {
  CustomFieldMetadata,
  EcsCompliantFieldMetadata,
  EnrichedFieldMetadata,
  IncompatibleFieldMetadata,
  PartitionedFieldMetadata,
  SameFamilyFieldMetadata,
  UnallowedValueCount,
} from '../types';

export const isEcsCompliantFieldMetadata = (
  x: EnrichedFieldMetadata
): x is EcsCompliantFieldMetadata => x.hasEcsMetadata && x.isEcsCompliant;

export const isSameFamilyFieldMetadata = (x: EnrichedFieldMetadata): x is SameFamilyFieldMetadata =>
  x.hasEcsMetadata && !x.isEcsCompliant && x.isInSameFamily;

export const isIncompatibleFieldMetadata = (
  x: EnrichedFieldMetadata
): x is IncompatibleFieldMetadata => x.hasEcsMetadata && !x.isEcsCompliant && !x.isInSameFamily;

export const isCustomFieldMetadata = (x: EnrichedFieldMetadata): x is CustomFieldMetadata =>
  !x.hasEcsMetadata;

export const getPartitionedFieldMetadata = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): PartitionedFieldMetadata =>
  enrichedFieldMetadata.reduce<PartitionedFieldMetadata>(
    (acc, field) => {
      acc.all.push(field);

      if (isCustomFieldMetadata(field)) {
        acc.custom.push(field);
      } else if (isEcsCompliantFieldMetadata(field)) {
        acc.ecsCompliant.push(field);
      } else if (isSameFamilyFieldMetadata(field)) {
        acc.sameFamily.push(field);
      } else if (isIncompatibleFieldMetadata(field)) {
        acc.incompatible.push(field);
      }

      return acc;
    },
    {
      all: [],
      custom: [],
      ecsCompliant: [],
      incompatible: [],
      sameFamily: [],
    }
  );

export interface FieldType {
  field: string;
  type: string;
}

function shouldReadKeys(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const getNextPathWithoutProperties = ({
  key,
  pathWithoutProperties,
  value,
}: {
  key: string;
  pathWithoutProperties: string;
  value: unknown;
}): string => {
  if (!pathWithoutProperties) {
    return key;
  }

  if (shouldReadKeys(value) && (key === 'properties' || key === 'fields')) {
    return `${pathWithoutProperties}`;
  } else {
    return `${pathWithoutProperties}.${key}`;
  }
};

export function getFieldTypes(mappingsProperties: Record<string, unknown>): FieldType[] {
  if (!shouldReadKeys(mappingsProperties)) {
    throw new TypeError(`Root value is not flatten-able, received ${mappingsProperties}`);
  }

  const result: FieldType[] = [];
  (function flatten(prefix, object, pathWithoutProperties) {
    for (const [key, value] of Object.entries(object)) {
      const path = prefix ? `${prefix}.${key}` : key;

      const nextPathWithoutProperties = getNextPathWithoutProperties({
        key,
        pathWithoutProperties,
        value,
      });

      if (shouldReadKeys(value)) {
        flatten(path, value, nextPathWithoutProperties);
      } else {
        if (nextPathWithoutProperties.endsWith('.type')) {
          const pathWithoutType = nextPathWithoutProperties.slice(
            0,
            nextPathWithoutProperties.lastIndexOf('.type')
          );

          result.push({
            field: pathWithoutType,
            type: `${value}`,
          });
        }
      }
    }
  })('', mappingsProperties, '');

  return result;
}

/**
 * Per https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html#_core_datatypes
 *
 * ```
 * Field types are grouped by _family_. Types in the same family have exactly
 * the same search behavior but may have different space usage or
 * performance characteristics.
 *
 * Currently, there are two type families, `keyword` and `text`. Other type
 * families have only a single field type. For example, the `boolean` type
 * family consists of one field type: `boolean`.
 * ```
 */
export const fieldTypeFamilies: Record<string, Set<string>> = {
  keyword: new Set(['keyword', 'constant_keyword', 'wildcard']),
  text: new Set(['text', 'match_only_text']),
};

export const isTypeInSameFamily = ({
  ecsExpectedType,
  type,
}: {
  ecsExpectedType: string | undefined;
  type: string;
}): boolean => {
  if (ecsExpectedType == null) {
    return false;
  }

  const allFamilies = Object.values(fieldTypeFamilies);
  return allFamilies.some((family) => family.has(ecsExpectedType) && family.has(type));
};

export const isMappingCompatible = ({
  ecsExpectedType,
  type,
}: {
  ecsExpectedType: string | undefined;
  type: string;
}): boolean => type === ecsExpectedType;

export const getEnrichedFieldMetadata = ({
  ecsMetadata,
  fieldMetadata,
  unallowedValues,
}: {
  ecsMetadata: EcsFlatTyped;
  fieldMetadata: FieldType;
  unallowedValues: Record<string, UnallowedValueCount[]>;
}): EnrichedFieldMetadata => {
  const { field, type } = fieldMetadata;
  const indexInvalidValues = unallowedValues[field] ?? [];

  // Check if the field is ECS-based
  if (has(field, ecsMetadata)) {
    const ecsExpectedType = ecsMetadata[field].type;

    const isEcsCompliant =
      isMappingCompatible({ ecsExpectedType, type }) && indexInvalidValues.length === 0;

    const isInSameFamily =
      !isMappingCompatible({ ecsExpectedType, type }) &&
      indexInvalidValues.length === 0 &&
      isTypeInSameFamily({ ecsExpectedType, type });

    if (isEcsCompliant) {
      return {
        ...ecsMetadata[field],
        indexFieldName: field,
        indexFieldType: type,
        indexInvalidValues: [],
        hasEcsMetadata: true,
        isEcsCompliant: true,
        isInSameFamily: false,
      };
    }

    // mutually exclusive with ECS compliant
    // because of mappings compatibility check
    if (isInSameFamily) {
      return {
        ...ecsMetadata[field],
        indexFieldName: field,
        indexFieldType: type,
        indexInvalidValues: [],
        hasEcsMetadata: true,
        isEcsCompliant: false,
        isInSameFamily: true,
      };
    }

    // incompatible field (not compliant and not in the same family)
    return {
      ...ecsMetadata[field],
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues,
      hasEcsMetadata: true,
      isEcsCompliant: false,
      isInSameFamily: false,
    };
  }

  // custom field
  return {
    indexFieldName: field,
    indexFieldType: type,
    indexInvalidValues: [],
    hasEcsMetadata: false,
    isEcsCompliant: false,
    isInSameFamily: false,
  };
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

export const getMissingTimestampFieldMetadata = (): IncompatibleFieldMetadata => ({
  ...EcsFlatTyped['@timestamp'],
  hasEcsMetadata: true,
  indexFieldName: '@timestamp',
  indexFieldType: '-',
  indexInvalidValues: [],
  isEcsCompliant: false,
  isInSameFamily: false, // `date` is not a member of any families
});

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

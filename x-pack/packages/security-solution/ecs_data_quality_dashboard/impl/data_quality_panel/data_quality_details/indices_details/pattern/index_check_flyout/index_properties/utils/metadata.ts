/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';

import { EcsFlatTyped } from '../../../../../../constants';
import {
  EcsBasedFieldMetadata,
  EnrichedFieldMetadata,
  PartitionedFieldMetadata,
  UnallowedValueCount,
} from '../../../../../../types';
import { getIsInSameFamily } from './get_is_in_same_family';

export const getPartitionedFieldMetadata = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): PartitionedFieldMetadata =>
  enrichedFieldMetadata.reduce<PartitionedFieldMetadata>(
    (acc, x) => ({
      all: [...acc.all, x],
      ecsCompliant: x.isEcsCompliant ? [...acc.ecsCompliant, x] : acc.ecsCompliant,
      custom: !x.hasEcsMetadata ? [...acc.custom, x] : acc.custom,
      incompatible:
        x.hasEcsMetadata && !x.isEcsCompliant && !x.isInSameFamily
          ? [...acc.incompatible, x]
          : acc.incompatible,
      sameFamily: x.isInSameFamily ? [...acc.sameFamily, x] : acc.sameFamily,
    }),
    {
      all: [],
      ecsCompliant: [],
      custom: [],
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

  if (has(fieldMetadata.field, ecsMetadata)) {
    const ecsExpectedType = ecsMetadata[field].type;
    const isEcsCompliant =
      isMappingCompatible({ ecsExpectedType, type }) && indexInvalidValues.length === 0;

    const isInSameFamily =
      !isMappingCompatible({ ecsExpectedType, type }) &&
      indexInvalidValues.length === 0 &&
      getIsInSameFamily({ ecsExpectedType, type });

    return {
      ...ecsMetadata[field],
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues,
      hasEcsMetadata: true,
      isEcsCompliant,
      isInSameFamily,
    };
  } else {
    return {
      indexFieldName: field,
      indexFieldType: type,
      indexInvalidValues: [],
      hasEcsMetadata: false,
      isEcsCompliant: false,
      isInSameFamily: false, // custom fields are never in the same family
    };
  }
};

export const getMissingTimestampFieldMetadata = (): EcsBasedFieldMetadata => ({
  ...EcsFlatTyped['@timestamp'],
  hasEcsMetadata: true,
  indexFieldName: '@timestamp',
  indexFieldType: '-',
  indexInvalidValues: [],
  isEcsCompliant: false,
  isInSameFamily: false, // `date` is not a member of any families
});

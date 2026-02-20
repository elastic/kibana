/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingBooleanProperty,
  MappingByteNumberProperty,
  MappingDateNanosProperty,
  MappingDateProperty,
  MappingDoubleNumberProperty,
  MappingFloatNumberProperty,
  MappingGeoPointProperty,
  MappingHalfFloatNumberProperty,
  MappingIntegerNumberProperty,
  MappingIpProperty,
  MappingKeywordProperty,
  MappingLongNumberProperty,
  MappingMatchOnlyTextProperty,
  MappingProperty,
  MappingShortNumberProperty,
  MappingTextProperty,
  MappingUnsignedLongNumberProperty,
  MappingVersionProperty,
  MappingWildcardProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { recursiveRecord } from '../shared/record_types';

export const FIELD_DEFINITION_TYPES = [
  'keyword',
  'match_only_text',
  'long',
  'double',
  'date',
  'boolean',
  'ip',
  'geo_point',
  'integer',
  'short',
  'byte',
  'float',
  'half_float',
  'text',
  'wildcard',
  'version',
  'unsigned_long',
  'date_nanos',
] as const;

export type FieldDefinitionType = (typeof FIELD_DEFINITION_TYPES)[number];

// We redefine "first class" parameters
export type FieldDefinitionConfig =
  | (MappingProperty & {
      type: FieldDefinitionType;
      format?: string;
    })
  | {
      type: 'system';
    };

// Parameters that we provide a generic (JSON blob) experience for
export type FieldDefinitionConfigAdvancedParameters = Omit<
  FieldDefinitionConfig,
  'type' | 'format'
>;

export const fieldDefinitionConfigSchema: z.Schema<FieldDefinitionConfig> = z.intersection(
  recursiveRecord,
  z.union([
    z.object({
      type: z.enum(FIELD_DEFINITION_TYPES),
      format: z.optional(NonEmptyString),
    }),
    z.object({
      type: z.literal('system'),
    }),
  ])
);

export interface FieldDefinition {
  [x: string]: FieldDefinitionConfig;
}

export type AllowedMappingProperty =
  | MappingKeywordProperty
  | MappingMatchOnlyTextProperty
  | MappingLongNumberProperty
  | MappingDoubleNumberProperty
  | MappingDateProperty
  | MappingBooleanProperty
  | MappingIpProperty
  | MappingGeoPointProperty
  | MappingIntegerNumberProperty
  | MappingShortNumberProperty
  | MappingByteNumberProperty
  | MappingFloatNumberProperty
  | MappingHalfFloatNumberProperty
  | MappingTextProperty
  | MappingWildcardProperty
  | MappingVersionProperty
  | MappingUnsignedLongNumberProperty
  | MappingDateNanosProperty;

export type StreamsMappingProperties = Record<string, AllowedMappingProperty>;

export function isMappingProperties(value: FieldDefinition): value is StreamsMappingProperties {
  return Object.values(value).every((prop) => prop.type !== 'system');
}

export const fieldDefinitionSchema: z.Schema<FieldDefinition> = z.record(
  z.string(),
  fieldDefinitionConfigSchema
);

export type InheritedFieldDefinitionConfig = FieldDefinitionConfig & {
  from: string;
  alias_for?: string;
};

export interface InheritedFieldDefinition {
  [x: string]: InheritedFieldDefinitionConfig;
}

export const inheritedFieldDefinitionSchema: z.Schema<InheritedFieldDefinition> = z.record(
  z.string(),
  z.intersection(
    fieldDefinitionConfigSchema,
    z.object({ from: NonEmptyString, alias_for: z.optional(NonEmptyString) })
  )
);

export type NamedFieldDefinitionConfig = FieldDefinitionConfig & {
  name: string;
};

export const namedFieldDefinitionConfigSchema: z.Schema<NamedFieldDefinitionConfig> =
  z.intersection(
    fieldDefinitionConfigSchema,
    z.object({
      name: NonEmptyString,
    })
  );

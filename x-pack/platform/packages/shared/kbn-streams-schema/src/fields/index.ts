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
import { z } from '@kbn/zod/v4';
import { NonEmptyString } from '@kbn/zod-helpers/v4';

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

// All field types including non-mapping types (for UI purposes)
export const ALL_FIELD_DEFINITION_TYPES = [...FIELD_DEFINITION_TYPES, 'system'] as const;
export type AllFieldDefinitionType = (typeof ALL_FIELD_DEFINITION_TYPES)[number];

// We redefine "first class" parameters
export type FieldDefinitionConfig =
  | (MappingProperty & {
      type: FieldDefinitionType;
      format?: string;
      description?: string;
    })
  /**
   * Documentation-only override for an inherited field: a stream may override only the description
   * without freezing the inherited ES mapping. In that case `type` MUST be omitted entirely.
   */
  | {
      description: string;
      type?: never;
      format?: never;
    }
  | {
      type: 'system';
      description?: string;
    };

// Parameters that we provide a generic (JSON blob) experience for
export type FieldDefinitionConfigAdvancedParameters = Omit<
  FieldDefinitionConfig,
  'type' | 'format' | 'description'
>;

// Mapping types: allow arbitrary ES mapping properties
const mappingFieldSchema = z.intersection(
  recursiveRecord,
  z.object({
    type: z.enum(FIELD_DEFINITION_TYPES),
    format: z.optional(NonEmptyString),
    description: z.optional(z.string()),
  })
);

// Documentation-only override: require description and forbid type entirely
const descriptionOnlyFieldSchema = z.strictObject({
  description: z.string(),
  type: z.never().optional(),
  format: z.never().optional(),
});

// System field type: only allow description override
const systemFieldSchema = z.strictObject({
  type: z.literal('system'),
  description: z.optional(z.string()),
});

export const fieldDefinitionConfigSchema = z
  .union([mappingFieldSchema, descriptionOnlyFieldSchema, systemFieldSchema])
  .meta({ id: 'FieldDefinitionConfig' }) as z.ZodType<FieldDefinitionConfig>;

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
  return Object.values(value).every((prop) => Boolean(prop.type) && prop.type !== 'system');
}

export const fieldDefinitionSchema: z.Schema<FieldDefinition> = z
  .record(z.string(), fieldDefinitionConfigSchema)
  .meta({ id: 'FieldDefinition' });

/**
 * Schema for classic stream field overrides.
 * Classic streams require a `type` for all field overrides - description-only fields are not supported.
 * This schema excludes the documentation-only override variant that allows type to be omitted.
 */
export type ClassicFieldDefinitionConfig =
  | (MappingProperty & {
      type: FieldDefinitionType;
      format?: string;
      description?: string;
    })
  | {
      type: 'system';
      description?: string;
    };

export const classicFieldDefinitionConfigSchema = (
  z.union([mappingFieldSchema, systemFieldSchema]) as z.ZodType<ClassicFieldDefinitionConfig>
).meta({ id: 'ClassicFieldDefinitionConfig' });

export interface ClassicFieldDefinition {
  [x: string]: ClassicFieldDefinitionConfig;
}

export const classicFieldDefinitionSchema: z.Schema<ClassicFieldDefinition> = z
  .record(z.string(), classicFieldDefinitionConfigSchema)
  .meta({ id: 'ClassicFieldDefinition' });

export type InheritedFieldDefinitionConfig = FieldDefinitionConfig & {
  from: string;
  alias_for?: string;
};

export interface InheritedFieldDefinition {
  [x: string]: InheritedFieldDefinitionConfig;
}

const inheritedFieldExtension = { from: NonEmptyString, alias_for: z.optional(NonEmptyString) };

export const inheritedFieldDefinitionSchema: z.Schema<InheritedFieldDefinition> = z
  .record(
    z.string(),
    z.union([
      mappingFieldSchema.and(z.object(inheritedFieldExtension)),
      descriptionOnlyFieldSchema.extend(inheritedFieldExtension),
      systemFieldSchema.extend(inheritedFieldExtension),
    ]) as z.ZodType<InheritedFieldDefinitionConfig>
  )
  .meta({ id: 'InheritedFieldDefinition' });

export type NamedFieldDefinitionConfig = FieldDefinitionConfig & {
  name: string;
};

const namedFieldExtension = { name: NonEmptyString };

export const namedFieldDefinitionConfigSchema: z.Schema<NamedFieldDefinitionConfig> = z.union([
  mappingFieldSchema.and(z.object(namedFieldExtension)),
  descriptionOnlyFieldSchema.extend(namedFieldExtension),
  systemFieldSchema.extend(namedFieldExtension),
]) as z.ZodType<NamedFieldDefinitionConfig>;

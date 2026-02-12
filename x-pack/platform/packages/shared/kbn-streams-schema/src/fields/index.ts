/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingBooleanProperty,
  MappingDateProperty,
  MappingDoubleNumberProperty,
  MappingGeoPointProperty,
  MappingIpProperty,
  MappingKeywordProperty,
  MappingLongNumberProperty,
  MappingMatchOnlyTextProperty,
  MappingProperty,
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
] as const;

export type FieldDefinitionType = (typeof FIELD_DEFINITION_TYPES)[number];

// All field types including non-mapping types (for UI purposes)
export const ALL_FIELD_DEFINITION_TYPES = [
  ...FIELD_DEFINITION_TYPES,
  'unmapped',
  'system',
] as const;
export type AllFieldDefinitionType = (typeof ALL_FIELD_DEFINITION_TYPES)[number];

// We redefine "first class" parameters
export type FieldDefinitionConfig =
  | (MappingProperty & {
      type: FieldDefinitionType;
      format?: string;
      description?: string;
    })
  | {
      type: 'system';
      description?: string;
    }
  | {
      type: 'unmapped';
      description?: string;
    };

// Parameters that we provide a generic (JSON blob) experience for
export type FieldDefinitionConfigAdvancedParameters = Omit<
  FieldDefinitionConfig,
  'type' | 'format' | 'description'
>;

export const fieldDefinitionConfigSchema: z.Schema<FieldDefinitionConfig> = z.intersection(
  recursiveRecord,
  z.union([
    z.object({
      type: z.enum(FIELD_DEFINITION_TYPES),
      format: z.optional(NonEmptyString),
      description: z.optional(z.string()),
    }),
    z.object({
      type: z.literal('system'),
      description: z.optional(z.string()),
    }),
    z.object({
      type: z.literal('unmapped'),
      description: z.optional(z.string()),
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
  | MappingGeoPointProperty;

export type StreamsMappingProperties = Record<string, AllowedMappingProperty>;

export function isMappingProperties(value: FieldDefinition): value is StreamsMappingProperties {
  return Object.values(value).every((prop) => prop.type !== 'system' && prop.type !== 'unmapped');
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

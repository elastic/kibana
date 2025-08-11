/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldDefinition,
  RoutingDefinition,
  StreamQuery,
  streamQuerySchema,
} from '@kbn/streams-schema';
import { fieldDefinitionSchema } from '@kbn/streams-schema/src/fields';
import { routingDefinitionSchema } from '@kbn/streams-schema/src/models/ingest/routing';
import { z } from '@kbn/zod';

export interface ContentPackIncludeAll {
  objects: { all: {} };
}

export type ContentPackIncludedObjects =
  | ContentPackIncludeAll
  | {
      objects: {
        queries: Array<{ id: string }>;
        routing: Array<{ destination: string } & ContentPackIncludedObjects>;
      };
    };

const includeAllSchema = z.object({
  objects: z.object({ all: z.strictObject({}) }),
});

export const isIncludeAll = (value: ContentPackIncludedObjects): value is ContentPackIncludeAll => {
  return includeAllSchema.safeParse(value).success;
};

export const contentPackIncludedObjectsSchema: z.Schema<ContentPackIncludedObjects> = z.lazy(() =>
  z.union([
    includeAllSchema,
    z.object({
      objects: z.object({
        queries: z.array(z.object({ id: z.string() })),
        routing: z.array(
          contentPackIncludedObjectsSchema.and(
            z.object({
              destination: z.string(),
            })
          )
        ),
      }),
    }),
  ])
);

export type ConflictResolution<K extends MergeablePropertiesKeys = MergeablePropertiesKeys> = {
  type: K;
  stream: string;
  id: string;
  value: MergeableProperties[K];
};

export const conflictResolutionSchema: z.Schema<ConflictResolution> = z.union([
  z.object({
    type: z.literal('field'),
    stream: z.string(),
    id: z.string(),
    value: fieldDefinitionSchema,
  }),
  z.object({
    type: z.literal('routing'),
    stream: z.string(),
    id: z.string(),
    value: routingDefinitionSchema,
  }),
  z.object({
    type: z.literal('query'),
    stream: z.string(),
    id: z.string(),
    value: streamQuerySchema,
  }),
]);

export type MergeableProperties = {
  field: FieldDefinition;
  routing: RoutingDefinition;
  query: StreamQuery;
};

export type MergeablePropertiesKeys = keyof MergeableProperties;

type PropertyAdded<K extends MergeablePropertiesKeys = MergeablePropertiesKeys> = {
  type: K;
  value: { to: MergeableProperties[K] };
};

type PropertyRemoved<K extends MergeablePropertiesKeys = MergeablePropertiesKeys> = {
  type: K;
  value: { from: MergeableProperties[K] };
};

type PropertyUpdated<K extends MergeablePropertiesKeys = MergeablePropertiesKeys> = {
  type: K;
  value: { from: MergeableProperties[K]; to: MergeableProperties[K] };
};

type PropertyChange<K extends MergeablePropertiesKeys = MergeablePropertiesKeys> =
  | PropertyAdded<K>
  | PropertyRemoved<K>
  | PropertyUpdated<K>;

export type PropertyConflict<K extends MergeablePropertiesKeys = MergeablePropertiesKeys> = {
  type: K;
  id: string;
  value: {
    resolution: 'system' | 'user';
    current: MergeableProperties[K];
    incoming: MergeableProperties[K];
  };
};

export type PropertyDiff<T extends MergeablePropertiesKeys = MergeablePropertiesKeys> = {
  added: PropertyAdded<T>[];
  removed: PropertyRemoved<T>[];
  updated: PropertyUpdated<T>[];
};

export interface StreamDiff {
  name: string;
  diff: PropertyDiff;
}

export type StreamDiffAndConflicts = StreamDiff & {
  conflicts: StreamConflict[];
};

export interface StreamConflict {
  name: string;
  conflicts: PropertyConflict[];
}

export function isRoutingChange(value: PropertyChange): value is PropertyChange<'routing'> {
  return value.type === 'routing';
}

export function isFieldChange(value: PropertyChange): value is PropertyChange<'field'> {
  return value.type === 'field';
}

export function isQueryChange(value: PropertyChange): value is PropertyChange<'query'> {
  return value.type === 'query';
}

export function isPropertyChangeOfType<T extends 'field' | 'routing' | 'query'>(
  change: PropertyChange,
  type: T
): change is Extract<PropertyChange, { type: T }> {
  return change.type === type;
}

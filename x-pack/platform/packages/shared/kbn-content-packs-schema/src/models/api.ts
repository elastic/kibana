/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
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

interface Diff<T> {
  from: T;
  to: T;
}

export type MergeableProperties<UseDiff extends boolean = false> = {
  fields: UseDiff extends true ? Diff<FieldDefinition>[] : FieldDefinition[];
  queries: UseDiff extends true ? Diff<StreamQuery>[] : StreamQuery[];
  routing: UseDiff extends true ? Diff<RoutingDefinition>[] : RoutingDefinition[];
};

export interface StreamDiff {
  name: string;
  diff: {
    added: MergeableProperties;
    removed: MergeableProperties;
    updated: MergeableProperties<true>;
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface ContentPackIncludeAll {
  all: {};
}

export interface ContentPackIncludeNone {
  none: {};
}

export interface ContentPackIncludeObjects {
  objects: {
    dashboards: string[];
    fields: ContentPackIncludeAll | ContentPackIncludeNone;
    processors: ContentPackIncludeAll | ContentPackIncludeNone;
  };
}

export type ContentPackIncludedObjects = ContentPackIncludeObjects | ContentPackIncludeAll;

const contentPackIncludeNoneSchema = z.object({ none: z.strictObject({}) });
const contentPackIncludeAllSchema = z.object({ all: z.strictObject({}) });

const contentPackIncludeObjectsSchema = z.object({
  objects: z.object({
    dashboards: z.array(z.string()),
    fields: z.union([contentPackIncludeAllSchema, contentPackIncludeNoneSchema]),
    processors: z.union([contentPackIncludeAllSchema, contentPackIncludeNoneSchema]),
  }),
});

export const isIncludeAll = (
  value:
    | ContentPackIncludedObjects
    | ContentPackIncludeObjects['objects']['fields']
    | ContentPackIncludeObjects['objects']['processors']
): value is ContentPackIncludeAll => {
  return contentPackIncludeAllSchema.safeParse(value).success;
};

export const contentPackIncludedObjectsSchema: z.Schema<ContentPackIncludedObjects> = z.union([
  contentPackIncludeObjectsSchema,
  contentPackIncludeAllSchema,
]);

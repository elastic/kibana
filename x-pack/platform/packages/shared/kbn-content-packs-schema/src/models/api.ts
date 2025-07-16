/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface ContentPackIncludeObjects {
  objects: {
    dashboards: string[];
    streams: string[];
  };
}

export interface ContentPackIncludeAll {
  all: {};
}

export type ContentPackIncludedObjects = ContentPackIncludeObjects | ContentPackIncludeAll;

const contentPackIncludeObjectsSchema = z.object({
  objects: z.object({ dashboards: z.array(z.string()), streams: z.array(z.string()) }),
});
export const contentPackIncludeAllSchema = z.object({ all: z.strictObject({}) });

export const isIncludeAll = (value: unknown): value is ContentPackIncludeAll => {
  return contentPackIncludeAllSchema.safeParse(value).success;
};

export const contentPackIncludedObjectsSchema: z.Schema<ContentPackIncludedObjects> = z.union([
  contentPackIncludeObjectsSchema,
  contentPackIncludeAllSchema,
]);

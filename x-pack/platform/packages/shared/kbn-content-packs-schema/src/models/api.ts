/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface ContentPackIncludeAll {
  objects: { all: {} };
}

export type ContentPackIncludedObjects =
  | ContentPackIncludeAll
  | {
      objects: {
        queries: { id: string }[];
        routing: ({ destination: string } & ContentPackIncludedObjects)[];
      };
    };

const includeAllSchema = z.object({
  objects: z.object({ all: z.strictObject({}) }),
});

export const isIncludeAll = (value: { objects: unknown }): value is ContentPackIncludeAll => {
  return includeAllSchema.safeParse(value).success;
};

export const contentPackIncludedObjectsSchema: z.Schema<ContentPackIncludedObjects> = z.lazy(() =>
  z.union([
    includeAllSchema,
    z.object({
      objects: z.object({
        queries: z.array(z.object({ id: z.string() })),
        routing: z.array(
          z.union([contentPackIncludedObjectsSchema, includeAllSchema]).and(
            z.object({
              destination: z.string(),
            })
          )
        ),
      }),
    }),
  ])
);

export const isContentPackIncludedObjects = (value: {
  objects: unknown;
}): value is ContentPackIncludedObjects => {
  return contentPackIncludedObjectsSchema.safeParse(value).success;
};

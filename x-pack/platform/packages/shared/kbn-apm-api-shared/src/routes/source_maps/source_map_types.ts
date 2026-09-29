/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

export const sourceMapSchema = z
  .object({
    version: z.number(),
    sources: z.array(z.string()),
    mappings: z.string(),
  })
  .extend({
    names: z.array(z.string()).optional(),
    file: z.string().optional(),
    sourceRoot: z.string().optional(),
    sourcesContent: z.array(z.union([z.string(), z.null()])).optional(),
  });

export type SourceMap = z.infer<typeof sourceMapSchema>;

export interface ApmSourceMapArtifactBody {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
  sourceMap: SourceMap;
}

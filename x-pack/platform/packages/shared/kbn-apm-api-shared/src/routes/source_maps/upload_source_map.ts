/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Artifact } from '@kbn/fleet-plugin/server';
import { defineRoute } from '../types';
import { sourceMapSchema } from './source_map_types';

export const uploadSourceMapRoute = defineRoute<Artifact | undefined>()({
  endpoint: 'POST /api/apm/sourcemaps 2023-10-31',
  params: z.object({
    body: z.object({
      service_name: z.string(),
      service_version: z.string(),
      bundle_filepath: z.string(),
      sourcemap: z
        .union([z.string(), z.instanceof(Buffer).transform((buf) => buf.toString('utf-8'))])
        .pipe(
          z.string().transform((value, ctx) => {
            try {
              return JSON.parse(value);
            } catch (err) {
              ctx.addIssue({ code: 'custom', message: err.message });
              return z.NEVER;
            }
          })
        )
        .pipe(sourceMapSchema),
    }),
  }),
});

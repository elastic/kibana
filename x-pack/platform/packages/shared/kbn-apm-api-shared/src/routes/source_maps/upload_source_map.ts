/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt } from '@kbn/io-ts-utils';
import type { Artifact } from '@kbn/fleet-plugin/server';
import { stringFromBufferRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { sourceMapRt } from './source_map_types';

export const uploadSourceMapRoute = defineRoute<Artifact | undefined>()({
  endpoint: 'POST /api/apm/sourcemaps 2023-10-31',
  params: t.type({
    body: t.type({
      service_name: t.string,
      service_version: t.string,
      bundle_filepath: t.string,
      sourcemap: t.union([t.string, stringFromBufferRt]).pipe(jsonRt).pipe(sourceMapRt),
    }),
  }),
});

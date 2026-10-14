/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import type { ApmSourceMapArtifactBody } from './source_map_types';
import { MAX_PAGE, MAX_PAGE_SIZE } from '../../constants';

export interface ListSourceMapArtifactsResponse {
  artifacts: Array<{
    body: ApmSourceMapArtifactBody;
    id: string;
    created: string;
    compressionAlgorithm: 'none' | 'zlib';
    encryptionAlgorithm: 'none';
    decodedSha256: string;
    decodedSize: number;
    encodedSha256: string;
    encodedSize: number;
    identifier: string;
    packageName: string;
    relative_url: string;
    type?: string | undefined;
  }>;
  total: number;
}
export const listSourceMapsRoute = defineRoute<ListSourceMapArtifactsResponse | undefined>()({
  endpoint: 'GET /api/apm/sourcemaps 2023-10-31',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          page: z.coerce.number().max(MAX_PAGE).optional(),
          perPage: z.coerce.number().max(MAX_PAGE_SIZE).optional(),
        })
        .optional(),
    })
  ),
});

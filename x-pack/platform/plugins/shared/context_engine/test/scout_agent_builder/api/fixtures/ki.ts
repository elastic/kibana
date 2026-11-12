/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

/** Mapping for a KI write-API fixture: covers the content, lifecycle, and provenance fields PATCH/DELETE/restore exercise. */
export const KI_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    title: { type: 'keyword' },
    content: { type: 'text' },
    updated_at: { type: 'date' },
    governance: {
      properties: {
        lifecycle: { properties: { status: { type: 'keyword' } } },
        provenance: {
          properties: {
            updated_by: { properties: { uri: { type: 'keyword' } } },
            created_by: { properties: { uri: { type: 'keyword' } } },
          },
        },
      },
    },
  },
} as const;

/** A stored KI document shaped for the write-API fixtures. */
export const storedKi = ({
  id,
  content,
  status,
}: {
  id: string;
  content: string;
  status?: 'deleted';
}) => ({
  '@timestamp': new Date(Date.now() - 60_000).toISOString(),
  id,
  type: 'index_metadata',
  title: id,
  content,
  governance: {
    provenance: { created_by: { uri: 'workflow://scout-ki-write-api' } },
    ...(status ? { lifecycle: { status } } : {}),
  },
});

/** Creates the backing index or data stream for a KI write-API fixture's `dest`. */
export const createKiDest = async (
  esClient: EsClient,
  dest: { type: 'index' | 'data_stream'; value: string }
): Promise<void> => {
  if (dest.type === 'index') {
    await esClient.indices.create({ index: dest.value, mappings: KI_MAPPINGS });
  } else {
    await esClient.indices.createDataStream({ name: dest.value });
  }
};

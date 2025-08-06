/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateRangeQuery } from '@kbn/es-query';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getSampleDocuments } from './get_sample_documents';
import { mergeSampleDocumentsWithFieldCaps } from './merge_sample_documents_with_field_caps';

export async function describeDataset({
  esClient,
  start,
  end,
  index,
  kql,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  index: string | string[];
  kql?: string;
}) {
  const [fieldCaps, hits] = await Promise.all([
    esClient.fieldCaps({
      index,
      fields: '*',
      index_filter: {
        bool: {
          filter: dateRangeQuery(start, end),
        },
      },
    }),
    getSampleDocuments({
      esClient,
      index,
      start,
      end,
      kql,
    }),
  ]);

  const total = hits.total;

  const analysis = mergeSampleDocumentsWithFieldCaps({
    hits: hits.hits,
    total: total ?? 0,
    fieldCaps,
  });

  return analysis;
}

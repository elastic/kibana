/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingFieldWithStats } from '../sampling';
import { getSampleDocs, createStatsFromSamples, combineFieldsWithStats } from '../sampling';
import type { ResolveResourceResponse } from './resolve_resource';
import { resolveResource } from './resolve_resource';

export type ResolvedResourceWithSampling = Omit<ResolveResourceResponse, 'fields'> & {
  fields: MappingFieldWithStats[];
};

/**
 * Resolve a resource and generate field stats based on sampling
 */
export const resolveResourceWithSamplingStats = async ({
  resourceName,
  esClient,
  samplingSize,
}: {
  resourceName: string;
  esClient: ElasticsearchClient;
  samplingSize?: number;
}) => {
  const [resource, stats] = await Promise.all([
    resolveResource({ resourceName, esClient }),
    getSampleDocs({ esClient, index: resourceName, size: samplingSize }).then(({ samples }) => {
      return createStatsFromSamples({ samples });
    }),
  ]);

  const combinedFields = combineFieldsWithStats({ fields: resource.fields, stats });

  return {
    ...resource,
    fields: combinedFields,
  };
};

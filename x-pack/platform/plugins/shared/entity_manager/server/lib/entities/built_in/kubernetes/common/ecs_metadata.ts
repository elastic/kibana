/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetadataField } from '@kbn/entities-schema';
import { globalMetadata } from './global_metadata';

export const commonEcsMetadata: MetadataField[] = [
  ...globalMetadata,
  {
    source: 'orchestrator.namespace',
    destination: 'orchestrator.namespace',
    aggregation: { type: 'terms', limit: 10 },
  },
  {
    source: 'orchestrator.cluster_ip',
    destination: 'orchestrator.cluster_id',
    aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
  },
  {
    source: 'orchestrator.cluster_name',
    destination: 'orchestrator.cluster_name',
    aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetadataField } from '@kbn/entities-schema';
import { globalMetadata } from './global_metadata';

export const commonOtelMetadata: MetadataField[] = [
  ...globalMetadata,
  {
    source: 'k8s.namespace.name',
    destination: 'k8s.namespace.name',
    aggregation: { type: 'terms', limit: 10 },
  },
  {
    source: 'k8s.cluster.name',
    destination: 'k8s.cluster.name',
    aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
  },
];

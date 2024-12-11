/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';
import { commonEcsIndexPatterns } from '../common/ecs_index_patterns';
import { globalMetadata } from '../common/global_metadata';

export const builtInKubernetesClusterEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_cluster_ecs`,
    filter: 'orchestrator.cluster.name: *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes Clusters from ECS data',
    description:
      'This definition extracts Kubernetes cluster entities from the Kubernetes integration data streams',
    type: 'k8s.cluster.ecs',
    indexPatterns: commonEcsIndexPatterns,
    identityFields: ['orchestrator.cluster.name'],
    displayNameTemplate: '{{orchestrator.cluster.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: [
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
    ],
  });

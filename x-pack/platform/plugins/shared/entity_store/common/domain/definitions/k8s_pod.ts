/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Coverage note: only ~72% of docs carry k8s.* enrichment (33,730 of ~46,700).
// The other 28% bypassed the k8sattributes OTel collector processor and are
// excluded by the implicit `k8s.pod.uid IS NOT NULL` filter from singleField identity.
//
// Supports both OTel (`k8s.pod.uid`) and metricbeat (`kubernetes.pod.uid`) field paths.
// Entity-level fieldEvaluations coalesce both namespaces into k8s.* before STATS so that
// collect/newestValue operations pick up data from either source.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const k8sPodEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.pod',
  name: `Kubernetes 'pod' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          when: isNotEmptyCondition('k8s.pod.uid'),
          ranking: [[{ field: 'k8s.pod.uid' }]],
        },
        {
          ranking: [[{ field: 'kubernetes.pod.uid' }]],
        },
      ],
    },
    documentsFilter: {
      or: [isNotEmptyCondition('k8s.pod.uid'), isNotEmptyCondition('kubernetes.pod.uid')],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes Pod',
  fieldEvaluations: [
    ENTITY_SOURCE_FIELD_EVALUATION,
    {
      destination: 'k8s.pod.uid',
      sources: [{ field: 'k8s.pod.uid' }, { field: 'kubernetes.pod.uid' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.pod.name',
      sources: [{ field: 'k8s.pod.name' }, { field: 'kubernetes.pod.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.namespace.name',
      sources: [{ field: 'k8s.namespace.name' }, { field: 'kubernetes.namespace' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.node.name',
      sources: [{ field: 'k8s.node.name' }, { field: 'kubernetes.node.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.deployment.name',
      sources: [{ field: 'k8s.deployment.name' }, { field: 'kubernetes.deployment.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.replicaset.name',
      sources: [{ field: 'k8s.replicaset.name' }, { field: 'kubernetes.replicaset.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.daemonset.name',
      sources: [{ field: 'k8s.daemonset.name' }, { field: 'kubernetes.daemonset.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
  ],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.pod.name' }),
    collect({ source: 'k8s.pod.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.node.name' }),
    collect({ source: 'k8s.deployment.name' }),
    collect({ source: 'k8s.replicaset.name' }),
    collect({ source: 'k8s.daemonset.name' }),
    collect({ source: 'container.id' }),
    collect({ source: 'fields.cluster' }),
    collect({ source: 'service.name' }),
    newestValue({ source: 'k8s.pod.ip', mapping: { type: 'ip' } }),
    oldestValue({ source: 'k8s.pod.start_time' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

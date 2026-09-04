/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Coverage note: only ~72% of docs carry k8s.* enrichment (33,730 of ~46,700).
// The other 28% bypassed the k8sattributes OTel collector processor and are
// excluded by the implicit `k8s.node.name IS NOT NULL` filter from singleField identity.
// Expected distinct values: 1 (mini-shop-control-plane).
//
// Supports both OTel (`k8s.node.name`) and metricbeat (`kubernetes.node.name`) field paths.
// Branch 1 matches OTel docs; branch 2 (no `when`) is the metricbeat fallback.
// Entity-level fieldEvaluations coalesce both paths into the k8s.* destination before STATS.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const k8sNodeEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.node',
  name: `Kubernetes 'node' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          when: isNotEmptyCondition('k8s.node.name'),
          ranking: [[{ field: 'k8s.node.name' }]],
        },
        {
          ranking: [[{ field: 'kubernetes.node.name' }]],
        },
      ],
    },
    documentsFilter: {
      or: [isNotEmptyCondition('k8s.node.name'), isNotEmptyCondition('kubernetes.node.name')],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes Node',
  fieldEvaluations: [
    ENTITY_SOURCE_FIELD_EVALUATION,
    {
      destination: 'k8s.node.name',
      sources: [{ field: 'k8s.node.name' }, { field: 'kubernetes.node.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.namespace.name',
      sources: [{ field: 'k8s.namespace.name' }, { field: 'kubernetes.namespace' }],
      fallbackValue: null,
      whenClauses: [],
    },
  ],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.node.name' }),
    collect({ source: 'k8s.node.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'fields.cluster' }),
    collect({ source: 'service.name' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

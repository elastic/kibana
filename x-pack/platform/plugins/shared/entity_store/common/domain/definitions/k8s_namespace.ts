/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Coverage note: only ~72% of docs carry k8s.* enrichment (33,730 of ~46,700).
// The other 28% bypassed the k8sattributes OTel collector processor and are
// excluded by the implicit `k8s.namespace.name IS NOT NULL` filter from singleField identity.
// Expected distinct values: 3 (mini-shop, kube-system, local-path-storage).
//
// Supports both OTel (`k8s.namespace.name`) and metricbeat (`kubernetes.namespace`) field paths.
// Note: metricbeat uses `kubernetes.namespace` (not `kubernetes.namespace.name`).

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const k8sNamespaceEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.namespace',
  name: `Kubernetes 'namespace' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          when: isNotEmptyCondition('k8s.namespace.name'),
          ranking: [[{ field: 'k8s.namespace.name' }]],
        },
        {
          ranking: [[{ field: 'kubernetes.namespace' }]],
        },
      ],
    },
    documentsFilter: {
      or: [isNotEmptyCondition('k8s.namespace.name'), isNotEmptyCondition('kubernetes.namespace')],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes Namespace',
  fieldEvaluations: [
    ENTITY_SOURCE_FIELD_EVALUATION,
    {
      destination: 'k8s.namespace.name',
      sources: [{ field: 'k8s.namespace.name' }, { field: 'kubernetes.namespace' }],
      fallbackValue: null,
      whenClauses: [],
    },
  ],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.node.name' }),
    collect({ source: 'fields.cluster' }),
    collect({ source: 'service.name' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

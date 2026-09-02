/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Coverage note: only ~72% of docs carry k8s.* enrichment (33,730 of ~46,700).
// The other 28% bypassed the k8sattributes OTel collector processor and are
// excluded by documentsFilter below.
//
// Identity is composite (k8s.pod.uid + k8s.container.name) because container
// names are not globally unique: 'wait-for-deps' and 'elasticsearch' each
// appear in 2 pods. Using the pod UID as the scoping part gives 18 distinct
// (pod, container) pairs vs. 16 distinct container names alone.
// k8s.pod.uid is preferred over k8s.pod.name because UIDs are stable across
// pod restarts on the same node.
//
// Supports both OTel (`k8s.*`) and metricbeat (`kubernetes.*`) field paths.
// Branch 1 matches OTel docs; branch 2 (no `when`) is the metricbeat fallback.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const k8sContainerEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.container',
  name: `Kubernetes 'container' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          when: {
            and: [isNotEmptyCondition('k8s.pod.uid'), isNotEmptyCondition('k8s.container.name')],
          },
          ranking: [[{ field: 'k8s.pod.uid' }, { sep: '/' }, { field: 'k8s.container.name' }]],
        },
        {
          ranking: [
            [{ field: 'kubernetes.pod.uid' }, { sep: '/' }, { field: 'kubernetes.container.name' }],
          ],
        },
      ],
    },
    documentsFilter: {
      or: [
        {
          and: [isNotEmptyCondition('k8s.pod.uid'), isNotEmptyCondition('k8s.container.name')],
        },
        {
          and: [
            isNotEmptyCondition('kubernetes.pod.uid'),
            isNotEmptyCondition('kubernetes.container.name'),
          ],
        },
      ],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes Container',
  fieldEvaluations: [
    ENTITY_SOURCE_FIELD_EVALUATION,
    {
      destination: 'k8s.pod.uid',
      sources: [{ field: 'k8s.pod.uid' }, { field: 'kubernetes.pod.uid' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.container.name',
      sources: [{ field: 'k8s.container.name' }, { field: 'kubernetes.container.name' }],
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
  ],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.container.name' }),
    collect({ source: 'k8s.container.name' }),
    collect({ source: 'k8s.pod.uid' }),
    collect({ source: 'k8s.pod.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'container.id' }),
    collect({ source: 'container.image.name' }),
    collect({ source: 'container.image.tag' }),
    collect({ source: 'kubernetes.container.image' }),
    newestValue({ source: 'kubernetes.container.status.phase' }),
    newestValue({ source: 'kubernetes.container.status.ready', mapping: { type: 'boolean' } }),
    newestValue({ source: 'kubernetes.container.status.reason' }),
    collect({ source: 'fields.cluster' }),
    collect({ source: 'service.name' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

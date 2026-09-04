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
// Identity is composite (k8s.namespace.name / k8s.daemonset.name) because
// daemonset names are unique within a namespace but not across namespaces.
// Expected distinct values: 1 (kindnet in kube-system).
// entity.name stores the bare daemonset name; the EUID carries the namespace prefix.
//
// Supports both OTel (`k8s.*`) and metricbeat (`kubernetes.*`) field paths.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const k8sDaemonSetEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.daemonset',
  name: `Kubernetes 'daemonset' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          when: {
            and: [
              isNotEmptyCondition('k8s.namespace.name'),
              isNotEmptyCondition('k8s.daemonset.name'),
            ],
          },
          ranking: [
            [{ field: 'k8s.namespace.name' }, { sep: '/' }, { field: 'k8s.daemonset.name' }],
          ],
        },
        {
          ranking: [
            [
              { field: 'kubernetes.namespace' },
              { sep: '/' },
              { field: 'kubernetes.daemonset.name' },
            ],
          ],
        },
      ],
    },
    documentsFilter: {
      or: [
        {
          and: [
            isNotEmptyCondition('k8s.namespace.name'),
            isNotEmptyCondition('k8s.daemonset.name'),
          ],
        },
        {
          and: [
            isNotEmptyCondition('kubernetes.namespace'),
            isNotEmptyCondition('kubernetes.daemonset.name'),
          ],
        },
      ],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes DaemonSet',
  fieldEvaluations: [
    ENTITY_SOURCE_FIELD_EVALUATION,
    {
      destination: 'k8s.namespace.name',
      sources: [{ field: 'k8s.namespace.name' }, { field: 'kubernetes.namespace' }],
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
    newestValue({ destination: 'entity.name', source: 'k8s.daemonset.name' }),
    collect({ source: 'k8s.daemonset.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.node.name' }),
    collect({ source: 'fields.cluster' }),
    collect({ source: 'service.name' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

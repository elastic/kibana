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
// Identity is composite (k8s.namespace.name / k8s.deployment.name) because
// deployment names are unique within a namespace but not across namespaces.
// Expected distinct values: 11.
// entity.name stores the bare deployment name; the EUID carries the namespace prefix.
//
// Supports both OTel (`k8s.*`) and metricbeat (`kubernetes.*`) field paths.
// Metricbeat uses `kubernetes.namespace` (not `kubernetes.namespace.name`) and
// `kubernetes.deployment.name` for the deployment name.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const k8sDeploymentEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.deployment',
  name: `Kubernetes 'deployment' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          when: {
            and: [
              isNotEmptyCondition('k8s.namespace.name'),
              isNotEmptyCondition('k8s.deployment.name'),
            ],
          },
          ranking: [
            [{ field: 'k8s.namespace.name' }, { sep: '/' }, { field: 'k8s.deployment.name' }],
          ],
        },
        {
          ranking: [
            [
              { field: 'kubernetes.namespace' },
              { sep: '/' },
              { field: 'kubernetes.deployment.name' },
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
            isNotEmptyCondition('k8s.deployment.name'),
          ],
        },
        {
          and: [
            isNotEmptyCondition('kubernetes.namespace'),
            isNotEmptyCondition('kubernetes.deployment.name'),
          ],
        },
      ],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes Deployment',
  fieldEvaluations: [
    ENTITY_SOURCE_FIELD_EVALUATION,
    {
      destination: 'k8s.namespace.name',
      sources: [{ field: 'k8s.namespace.name' }, { field: 'kubernetes.namespace' }],
      fallbackValue: null,
      whenClauses: [],
    },
    {
      destination: 'k8s.deployment.name',
      sources: [{ field: 'k8s.deployment.name' }, { field: 'kubernetes.deployment.name' }],
      fallbackValue: null,
      whenClauses: [],
    },
  ],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.deployment.name' }),
    collect({ source: 'k8s.deployment.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.replicaset.name' }),
    collect({ source: 'fields.cluster' }),
    collect({ source: 'service.name' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

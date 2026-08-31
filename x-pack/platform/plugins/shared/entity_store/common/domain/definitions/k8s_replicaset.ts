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
// Identity is composite (k8s.namespace.name / k8s.replicaset.name) because
// replicaset names are unique within a namespace but not across namespaces.
// Expected distinct values: 11.
// entity.name stores the bare replicaset name; the EUID carries the namespace prefix.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const k8sReplicaSetEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.replicaset',
  name: `Kubernetes 'replicaset' Entity Store Definition`,
  identityField: {
    euidRanking: {
      branches: [
        {
          ranking: [
            [{ field: 'k8s.namespace.name' }, { sep: '/' }, { field: 'k8s.replicaset.name' }],
          ],
        },
      ],
    },
    documentsFilter: {
      and: [isNotEmptyCondition('k8s.namespace.name'), isNotEmptyCondition('k8s.replicaset.name')],
    },
  },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes ReplicaSet',
  fieldEvaluations: [ENTITY_SOURCE_FIELD_EVALUATION],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.replicaset.name' }),
    collect({ source: 'k8s.replicaset.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.deployment.name' }),
    collect({ source: 'service.name' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

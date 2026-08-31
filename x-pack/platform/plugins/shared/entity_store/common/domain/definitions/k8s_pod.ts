/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Coverage note: only ~72% of docs carry k8s.* enrichment (33,730 of ~46,700).
// The other 28% bypassed the k8sattributes OTel collector processor and are
// excluded by the implicit `k8s.pod.uid IS NOT NULL` filter from singleField identity.

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const k8sPodEntityDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.pod',
  name: `Kubernetes 'pod' Entity Store Definition`,
  identityField: { singleField: 'k8s.pod.uid' },
  indexPatterns: [],
  entityTypeFallback: 'Kubernetes Pod',
  fieldEvaluations: [ENTITY_SOURCE_FIELD_EVALUATION],
  fields: [
    newestValue({ destination: 'entity.name', source: 'k8s.pod.name' }),
    collect({ source: 'k8s.pod.name' }),
    collect({ source: 'k8s.namespace.name' }),
    collect({ source: 'k8s.node.name' }),
    collect({ source: 'k8s.deployment.name' }),
    collect({ source: 'k8s.replicaset.name' }),
    collect({ source: 'k8s.daemonset.name' }),
    collect({ source: 'container.id' }),
    collect({ source: 'service.name' }),
    newestValue({ source: 'k8s.pod.ip', mapping: { type: 'ip' } }),
    oldestValue({ source: 'k8s.pod.start_time' }),
    ...getCommonFieldDescriptions('entity'),
    ...getEntityFieldsDescriptions(),
  ],
} as const satisfies EntityDefinitionWithoutId;

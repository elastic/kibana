/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import type { EntityType } from './entity_schema';
import { type EntityDefinitionWithoutId, type ManagedEntityDefinition } from './entity_schema';
import { hostEntityDefinition } from './host';
import { userEntityDefinition } from './user';
import { serviceEntityDefinition } from './service';
import { genericEntityDefinition } from './generic';
import { k8sPodEntityDefinition } from './k8s_pod';
import { k8sContainerEntityDefinition } from './k8s_container';
import { k8sDeploymentEntityDefinition } from './k8s_deployment';
import { k8sReplicaSetEntityDefinition } from './k8s_replicaset';
import { k8sNamespaceEntityDefinition } from './k8s_namespace';
import { k8sNodeEntityDefinition } from './k8s_node';
import { k8sDaemonSetEntityDefinition } from './k8s_daemonset';
import { perfEntityDefinitions } from './perf_synthetic';

// The perf.entity.NNN entries are added via spread from perfEntityDefinitions. TypeScript cannot
// verify at compile time that the spread covers all 89 required keys (it sees Record<string, ...>),
// so `satisfies Record<EntityType, ...>` is not used here. The `assert` in
// getEntityDefinitionWithoutId guards unknown types at runtime.
const entitiesDefinitionRegistry: Record<string, EntityDefinitionWithoutId> = {
  host: hostEntityDefinition,
  user: userEntityDefinition,
  service: serviceEntityDefinition,
  generic: genericEntityDefinition,
  'k8s.pod': k8sPodEntityDefinition,
  'k8s.container': k8sContainerEntityDefinition,
  'k8s.deployment': k8sDeploymentEntityDefinition,
  'k8s.replicaset': k8sReplicaSetEntityDefinition,
  'k8s.namespace': k8sNamespaceEntityDefinition,
  'k8s.node': k8sNodeEntityDefinition,
  'k8s.daemonset': k8sDaemonSetEntityDefinition,
  ...perfEntityDefinitions,
};

export const getEntityDefinitionId = (entityType: EntityType, space: string) =>
  `security_${entityType}_${space}`;

export function getEntityDefinition(type: EntityType, namespace: string): ManagedEntityDefinition {
  const definition = getEntityDefinitionWithoutId(type);

  return {
    ...definition,
    id: getEntityDefinitionId(type, namespace),
    type,
  };
}

export function getEntityDefinitionWithoutId(type: EntityType): EntityDefinitionWithoutId {
  const definition = entitiesDefinitionRegistry[type];
  assert(definition, `No entity description found for type: ${type}`);

  return definition;
}

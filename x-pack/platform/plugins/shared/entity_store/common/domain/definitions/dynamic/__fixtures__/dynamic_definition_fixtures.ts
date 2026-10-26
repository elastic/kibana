/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test fixtures only. Nothing registers these, the plugin does not export them, and like every
 * `__fixtures__` directory this one is left out of the distributable, so an import from production
 * code fails the build rather than shipping them. The real Observability definitions are registered
 * by the inventory plugin at its setup.
 *
 * Each fixture carries `dynamic` and no `extraction`, shaped like a definition the inventory plugin
 * will register, to prove the schema and the whole-definition rules accept that shape. Index
 * patterns and field names are illustrative and not checked against data.
 */

import { isNotEmptyCondition } from '../../common_fields';
import type { EntityDefinitionManagedBy, EntityDefinitionWithoutId } from '../../entity_schema';
import { buildUserEntityDefinition } from '../../user';

/** A fixture with `managedBy` set, so it can go straight to the registry in tests. */
type DynamicDefinitionFixture = EntityDefinitionWithoutId & {
  managedBy: EntityDefinitionManagedBy;
};

const managedBy: EntityDefinitionManagedBy = { kind: 'plugin', id: 'entityInventory' };

export const k8sPodDynamicFixture: DynamicDefinitionFixture = {
  type: 'k8s.pod',
  name: 'Pod',
  managedBy,
  // One identity field for both sources; the ECS source would need `k8s.pod.uid` aliased to
  // `kubernetes.pod.uid` in its mapping.
  identityField: { singleField: 'k8s.pod.uid' },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        attributes: [
          { name: 'namespace', field: 'k8s.namespace.name' },
          { name: 'node', field: 'k8s.node.name' },
          {
            name: 'phase',
            field: 'k8s.pod.phase',
            valueLabels: {
              '1': 'pending',
              '2': 'running',
              '3': 'succeeded',
              '4': 'failed',
              '5': 'unknown',
            },
          },
        ],
      },
      {
        indexPattern: 'metrics-kubernetes.state_pod-*',
        filter: 'metricset.name == "state_pod"',
        attributes: [
          { name: 'namespace', field: 'kubernetes.namespace' },
          { name: 'node', field: 'kubernetes.node.name' },
          {
            name: 'phase',
            field: 'kubernetes.pod.status.phase',
            valueLabels: {
              Pending: 'pending',
              Running: 'running',
              Succeeded: 'succeeded',
              Failed: 'failed',
              Unknown: 'unknown',
            },
          },
        ],
      },
    ],
  },
};

export const k8sNodeDynamicFixture: DynamicDefinitionFixture = {
  type: 'k8s.node',
  name: 'Node',
  managedBy,
  identityField: { singleField: 'k8s.node.name' },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        filter: 'k8s.pod.uid IS NULL',
        attributes: [{ name: 'os', field: 'os.type' }],
      },
    ],
  },
};

export const k8sDeploymentDynamicFixture: DynamicDefinitionFixture = {
  type: 'k8s.deployment',
  name: 'Deployment',
  managedBy,
  identityField: { singleField: 'k8s.deployment.name' },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-k8sclusterreceiver.otel-default',
        attributes: [
          { name: 'namespace', field: 'k8s.namespace.name' },
          { name: 'desired', field: 'k8s.deployment.desired' },
        ],
      },
    ],
  },
};

/** The Security `host` identity, copied rather than imported so the fixture stands alone. */
export const hostDynamicFixture: DynamicDefinitionFixture = {
  type: 'host',
  name: 'Host',
  managedBy,
  identityField: {
    euidRanking: {
      branches: [
        {
          ranking: [[{ field: 'host.id' }], [{ field: 'host.name' }], [{ field: 'host.hostname' }]],
        },
      ],
    },
    documentsFilter: {
      or: [
        isNotEmptyCondition('host.id'),
        isNotEmptyCondition('host.name'),
        isNotEmptyCondition('host.hostname'),
      ],
    },
  },
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-hostmetricsreceiver.otel-default',
        attributes: [
          { name: 'os_name', field: 'host.os.name' },
          { name: 'os_type', field: 'os.type' },
        ],
      },
      {
        indexPattern: 'metrics-system.*',
        filter: 'metricset.name == "cpu"',
        attributes: [
          { name: 'os_name', field: 'host.os.name' },
          { name: 'os_type', field: 'host.os.type' },
        ],
      },
    ],
  },
};

/** Every fixture above, each expected to validate and register. */
export const DYNAMIC_DEFINITION_FIXTURES: readonly DynamicDefinitionFixture[] = [
  k8sPodDynamicFixture,
  k8sNodeDynamicFixture,
  k8sDeploymentDynamicFixture,
  hostDynamicFixture,
];

/** The Security `user` identity with a `dynamic` block: not servable, so it must be rejected. */
export const userShapedDynamicFixture: DynamicDefinitionFixture = {
  type: 'user',
  name: 'User',
  managedBy,
  identityField: buildUserEntityDefinition().identityField,
  dynamic: {
    sources: [
      {
        indexPattern: 'logs-*',
        attributes: [{ name: 'full_name', field: 'user.full_name' }],
      },
    ],
  },
};

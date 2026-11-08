/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImpactMapCatalog,
  ImpactMapEntityType,
  ImpactMapMetadataField,
  ImpactMapRelationshipType,
} from './impact_map';

/** Icons EUI is known to have, so a name the agent made up never draws a broken image. */
export const KNOWN_EUI_ICONS = [
  'logoKubernetes',
  'logoDocker',
  'logoAWS',
  'logoAzure',
  'logoGCP',
  'logoCloud',
  'database',
  'globe',
  'compute',
  'apps',
  'package',
] as const;

const KNOWN_ICON_BY_LOWERCASE = new Map<string, string>(
  KNOWN_EUI_ICONS.map((icon) => [icon.toLowerCase(), icon])
);

const KUBERNETES_WORDS = /kubernetes|k8s/i;

/**
 * Repairs a stored or incoming entity type without changing what the agent meant:
 * - an icon name EUI has, in any case (`logoGcp`), becomes its real name, and one it does not have
 *   is dropped, so the renderer falls back to a generic icon instead of a broken one;
 * - a `service` type with no APM agent and a Kubernetes name or an icon is infrastructure, which is
 *   how types were saved before that kind existed.
 */
export const normalizeEntityType = (type: ImpactMapEntityType): ImpactMapEntityType => {
  const { icon } = type;
  let next = type;
  if (icon?.eui_icon) {
    const { eui_icon: named, ...rest } = icon;
    const known = KNOWN_ICON_BY_LOWERCASE.get(named.toLowerCase());
    next = { ...next, icon: known ? { ...rest, eui_icon: known } : rest };
  }
  if (
    next.kind === 'service' &&
    !next.icon?.agent_name &&
    (next.icon?.eui_icon || KUBERNETES_WORDS.test(`${next.id} ${next.label}`))
  ) {
    next = { ...next, kind: 'infrastructure' };
  }
  return next;
};

const field = (key: string, label: string, featured?: boolean): ImpactMapMetadataField => ({
  key,
  label,
  ...(featured ? { featured } : {}),
});

const kubernetesType = (
  id: string,
  label: string,
  extra: ImpactMapMetadataField[] = []
): ImpactMapEntityType => ({
  id,
  label,
  kind: 'infrastructure',
  icon: { eui_icon: 'logoKubernetes' },
  metadata_fields: [
    field('k8s.cluster.name', 'Kubernetes cluster', true),
    field('k8s.namespace.name', 'Namespace', true),
    ...extra,
  ],
});

const serviceType = (id: string, label: string, agentName?: string): ImpactMapEntityType => ({
  id,
  label,
  kind: 'service',
  ...(agentName ? { icon: { agent_name: agentName } } : {}),
  metadata_fields: [
    field('deployment.environment.name', 'Environment', true),
    field('service.version', 'Version'),
    field('k8s.namespace.name', 'Namespace'),
  ],
});

const dependencyType = (
  id: string,
  label: string,
  spanType: string,
  spanSubtype: string
): ImpactMapEntityType => ({
  id,
  label,
  kind: 'dependency',
  icon: { span_type: spanType, span_subtype: spanSubtype },
  metadata_fields: [
    field('server.address', 'Address', true),
    field('server.port', 'Port'),
    field('db.system.name', 'Database system'),
    field('cloud.provider', 'Cloud provider'),
  ],
});

/**
 * Types every space starts with, so the agent classifies a Kubernetes deployment or a Postgres
 * database the same way the first time. They live in code, not in the catalog index: a space's own
 * type with the same id wins, and an improvement here reaches every space without a migration.
 */
export const BUILT_IN_ENTITY_TYPES: readonly ImpactMapEntityType[] = [
  kubernetesType('k8s_deployment', 'Kubernetes deployment', [
    field('k8s.deployment.name', 'Deployment'),
  ]),
  kubernetesType('k8s_statefulset', 'Kubernetes StatefulSet'),
  kubernetesType('k8s_daemonset', 'Kubernetes DaemonSet'),
  kubernetesType('k8s_pod', 'Kubernetes pod', [
    field('k8s.pod.name', 'Pod'),
    field('k8s.node.name', 'Node'),
  ]),
  {
    id: 'k8s_node',
    label: 'Kubernetes node',
    kind: 'infrastructure',
    icon: { eui_icon: 'logoKubernetes' },
    metadata_fields: [
      field('k8s.cluster.name', 'Kubernetes cluster', true),
      field('cloud.availability_zone', 'Availability zone', true),
      field('host.type', 'Instance type'),
    ],
  },
  {
    id: 'k8s_namespace',
    label: 'Kubernetes namespace',
    kind: 'infrastructure',
    icon: { eui_icon: 'logoKubernetes' },
    metadata_fields: [field('k8s.cluster.name', 'Kubernetes cluster', true)],
  },
  {
    id: 'host',
    label: 'Host',
    kind: 'infrastructure',
    icon: { eui_icon: 'compute' },
    metadata_fields: [
      field('cloud.provider', 'Cloud provider', true),
      field('cloud.region', 'Region', true),
      field('cloud.availability_zone', 'Availability zone', true),
      field('host.type', 'Instance type'),
    ],
  },
  {
    id: 'container',
    label: 'Container',
    kind: 'infrastructure',
    icon: { eui_icon: 'logoDocker' },
    metadata_fields: [
      field('container.image.name', 'Container image', true),
      field('host.name', 'Host'),
    ],
  },
  serviceType('service', 'Service'),
  serviceType('nodejs_service', 'Node.js service', 'nodejs'),
  serviceType('java_service', 'Java service', 'java'),
  serviceType('go_service', 'Go service', 'go'),
  serviceType('python_service', 'Python service', 'python'),
  serviceType('dotnet_service', '.NET service', 'dotnet'),
  dependencyType('postgresql', 'PostgreSQL', 'db', 'postgresql'),
  dependencyType('mysql', 'MySQL', 'db', 'mysql'),
  dependencyType('elasticsearch', 'Elasticsearch', 'db', 'elasticsearch'),
  dependencyType('redis', 'Redis', 'cache', 'redis'),
  dependencyType('kafka_topic', 'Kafka topic', 'messaging', 'kafka'),
  dependencyType('external_api', 'External API', 'external', 'http'),
];

const relationshipType = (id: string, label: string): ImpactMapRelationshipType => ({ id, label });

export const BUILT_IN_RELATIONSHIP_TYPES: readonly ImpactMapRelationshipType[] = [
  relationshipType('calls', 'CALLS'),
  relationshipType('runs_on', 'RUNS_ON'),
  relationshipType('reads_from', 'READS_FROM'),
  relationshipType('writes_to', 'WRITES_TO'),
  relationshipType('publishes_to', 'PUBLISHES_TO'),
  relationshipType('subscribes_to', 'SUBSCRIBES_TO'),
  relationshipType('depends_on', 'DEPENDS_ON'),
];

/** The types in code, as a catalog. */
export const BUILT_IN_CATALOG: ImpactMapCatalog = {
  entity_types: [...BUILT_IN_ENTITY_TYPES],
  relationship_types: [...BUILT_IN_RELATIONSHIP_TYPES],
};

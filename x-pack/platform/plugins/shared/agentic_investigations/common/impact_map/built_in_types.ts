/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STANDARD_METADATA_FIELDS } from './metadata';
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

const labelOf = new Map(STANDARD_METADATA_FIELDS.map(({ key, label }) => [key, label]));

/** A field of a type, labelled as the OpenTelemetry registry names it; featured leads the flyout. */
const field = (key: string, featured?: boolean, label?: string): ImpactMapMetadataField => ({
  key,
  label: label ?? labelOf.get(key) ?? key,
  ...(featured ? { featured } : {}),
});

/** The first of each key wins, so a type can lead with a field it also lists later. */
const uniqueFields = (fields: ImpactMapMetadataField[]): ImpactMapMetadataField[] => {
  const seen = new Set<string>();
  return fields.filter(({ key }) => !seen.has(key) && seen.add(key));
};

const CLOUD_PLACEMENT = [
  field('cloud.provider', true),
  field('cloud.region', true),
  field('cloud.availability_zone', true),
];

/**
 * A Kubernetes object: infrastructure with the Kubernetes logo. The cluster and namespace are what
 * you need to find it, so they lead; `k8s.<object>.name` and `.uid` identify it, as in the
 * OpenTelemetry entity of the same name.
 */
const kubernetesType = (
  object: string,
  label: string,
  description: string,
  options: { namespaced?: boolean; extra?: ImpactMapMetadataField[] } = {}
): ImpactMapEntityType => {
  const { namespaced = true, extra = [] } = options;
  return {
    id: `k8s.${object}`,
    label,
    kind: 'infrastructure',
    icon: { eui_icon: 'logoKubernetes' },
    description,
    metadata_fields: uniqueFields([
      field('k8s.cluster.name', true),
      ...(namespaced ? [field('k8s.namespace.name', true)] : []),
      ...extra,
      field(`k8s.${object}.name`),
      field(`k8s.${object}.uid`),
    ]),
  };
};

const serviceType = (id: string, label: string, agentName?: string): ImpactMapEntityType => ({
  id,
  label,
  kind: 'service',
  ...(agentName ? { icon: { agent_name: agentName } } : {}),
  description: 'Application code you run.',
  metadata_fields: [
    field('deployment.environment.name', true),
    field('service.namespace'),
    field('service.version'),
    field('service.instance.id'),
    field('telemetry.sdk.language'),
    field('k8s.cluster.name'),
    field('k8s.namespace.name'),
  ],
});

const dependencyType = (
  id: string,
  label: string,
  icon: { span_type: string; span_subtype: string },
  fields: ImpactMapMetadataField[]
): ImpactMapEntityType => ({
  id,
  label,
  kind: 'dependency',
  icon,
  description: 'Something services call.',
  metadata_fields: [...fields, field('server.address', true), field('server.port')],
});

/**
 * Types every space starts with, named after the OpenTelemetry entity registry
 * (https://opentelemetry.io/docs/specs/semconv/registry/entities/) and the entities that appear
 * in our OTel data (Kubernetes objects, hosts, containers, services). Dependencies follow the
 * semantic conventions for databases, messaging and generative AI. They live in code, not in the
 * catalog index: a space's own type with the same id wins, and an improvement here reaches every
 * space without a migration.
 */
export const BUILT_IN_ENTITY_TYPES: readonly ImpactMapEntityType[] = [
  kubernetesType('cluster', 'Kubernetes cluster', 'A Kubernetes cluster.', {
    namespaced: false,
    extra: CLOUD_PLACEMENT,
  }),
  kubernetesType('namespace', 'Kubernetes namespace', 'A namespace in a cluster.'),
  kubernetesType('node', 'Kubernetes node', 'A machine in a cluster that runs pods.', {
    namespaced: false,
    extra: [
      field('k8s.node.hostname'),
      field('k8s.node.ip'),
      field('host.type'),
      field('cloud.availability_zone', true),
    ],
  }),
  kubernetesType('deployment', 'Kubernetes deployment', 'Keeps a set of replicated pods running.', {
    extra: [field('app.label.name'), field('app.label.version')],
  }),
  kubernetesType('statefulset', 'Kubernetes StatefulSet', 'Replicated pods with stable identity.'),
  kubernetesType('daemonset', 'Kubernetes DaemonSet', 'One pod on every node.'),
  kubernetesType('replicaset', 'Kubernetes ReplicaSet', 'The pods a deployment currently runs.'),
  kubernetesType('job', 'Kubernetes job', 'A task that runs to completion.'),
  kubernetesType('cronjob', 'Kubernetes CronJob', 'A job that runs on a schedule.'),
  kubernetesType('hpa', 'Kubernetes autoscaler', 'A horizontal pod autoscaler.'),
  kubernetesType('resourcequota', 'Kubernetes resource quota', 'Limits a namespace may use.'),
  kubernetesType('pod', 'Kubernetes pod', 'A group of containers on one node.', {
    extra: [field('k8s.node.name', true), field('k8s.pod.ip')],
  }),
  kubernetesType('container', 'Kubernetes container', 'A container in a pod.', {
    extra: [
      field('k8s.pod.name', true),
      field('k8s.container.name'),
      field('container.image.name'),
      field('k8s.container.status.last_terminated_reason'),
    ],
  }),
  {
    id: 'host',
    label: 'Host',
    kind: 'infrastructure',
    icon: { eui_icon: 'compute' },
    description: 'A physical or virtual machine.',
    metadata_fields: [
      ...CLOUD_PLACEMENT,
      field('host.name', true),
      field('host.id'),
      field('host.type'),
      field('host.arch'),
      field('os.type'),
    ],
  },
  {
    id: 'container',
    label: 'Container',
    kind: 'infrastructure',
    icon: { eui_icon: 'logoDocker' },
    description: 'A container outside Kubernetes.',
    metadata_fields: [
      field('container.name', true),
      field('container.image.name', true),
      field('container.image.tag'),
      field('container.id'),
      field('host.name'),
    ],
  },
  {
    id: 'process',
    label: 'Process',
    kind: 'infrastructure',
    icon: { eui_icon: 'compute' },
    description: 'An operating system process.',
    metadata_fields: [
      field('process.executable.name', true),
      field('process.pid'),
      field('process.command_line'),
      field('process.owner'),
      field('host.name'),
    ],
  },
  serviceType('service', 'Service'),
  serviceType('nodejs_service', 'Node.js service', 'nodejs'),
  serviceType('java_service', 'Java service', 'java'),
  serviceType('go_service', 'Go service', 'go'),
  serviceType('python_service', 'Python service', 'python'),
  serviceType('dotnet_service', '.NET service', 'dotnet'),
  dependencyType('db.postgresql', 'PostgreSQL', { span_type: 'db', span_subtype: 'postgresql' }, [
    field('db.namespace', true),
    field('db.system.name'),
  ]),
  dependencyType('db.mysql', 'MySQL', { span_type: 'db', span_subtype: 'mysql' }, [
    field('db.namespace', true),
    field('db.system.name'),
  ]),
  dependencyType(
    'db.elasticsearch',
    'Elasticsearch',
    { span_type: 'db', span_subtype: 'elasticsearch' },
    [field('db.namespace'), field('db.system.name')]
  ),
  dependencyType('db.redis', 'Redis', { span_type: 'cache', span_subtype: 'redis' }, [
    field('db.system.name'),
  ]),
  dependencyType(
    'messaging.kafka',
    'Kafka topic',
    { span_type: 'messaging', span_subtype: 'kafka' },
    [field('messaging.destination.name', true), field('messaging.system')]
  ),
  dependencyType(
    'gen_ai.provider',
    'Generative AI provider',
    { span_type: 'external', span_subtype: 'http' },
    [field('gen_ai.provider.name', true), field('gen_ai.request.model')]
  ),
  dependencyType('external_api', 'External API', { span_type: 'external', span_subtype: 'http' }, [
    field('url.full'),
  ]),
];

/**
 * Ids used before the types followed the OpenTelemetry registry. They are read as the new id, so
 * a stored map or catalog and a new write meet on one type.
 */
const TYPE_ALIASES: Record<string, string> = {
  k8s_cluster: 'k8s.cluster',
  k8s_namespace: 'k8s.namespace',
  k8s_node: 'k8s.node',
  k8s_deployment: 'k8s.deployment',
  k8s_statefulset: 'k8s.statefulset',
  k8s_daemonset: 'k8s.daemonset',
  k8s_replicaset: 'k8s.replicaset',
  k8s_job: 'k8s.job',
  k8s_cronjob: 'k8s.cronjob',
  k8s_hpa: 'k8s.hpa',
  k8s_pod: 'k8s.pod',
  k8s_container: 'k8s.container',
  postgresql: 'db.postgresql',
  postgres: 'db.postgresql',
  mysql: 'db.mysql',
  elasticsearch: 'db.elasticsearch',
  redis: 'db.redis',
  kafka_topic: 'messaging.kafka',
  kafka: 'messaging.kafka',
  openai: 'gen_ai.provider',
};

/** The id a type goes by now. */
export const canonicalEntityTypeId = (id: string): string => TYPE_ALIASES[id] ?? id;

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

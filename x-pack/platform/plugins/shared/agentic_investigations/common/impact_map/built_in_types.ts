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
  'storage',
  'cluster',
  'link',
  'lock',
  'logoElastic',
  'logoElasticsearch',
  'logoKibana',
  'logoLogstash',
  'logoBeats',
  'logoKafka',
  'logoRedis',
  'logoMemcached',
  'logoPostgres',
  'logoMySQL',
  'logoMongodb',
  'logoCouchbase',
  'logoRabbitmq',
  'logoNginx',
  'logoHAproxy',
  'logoApache',
  'logoEtcd',
  'logoCeph',
  'logoPrometheus',
  'logoGithub',
  'logoSlack',
  'logoWebhook',
  'users',
  'user',
  'tag',
  'mapMarker',
  'shield',
  'layers',
  'gear',
  'merge',
  'branch',
  'home',
  'plugs',
  'rocket',
  'productCloudInfra',
  'bolt',
  'bell',
  'clock',
  'wrench',
  'nested',
  'symlink',
  'inspect',
  'sparkles',
  'search',
  'tokenEvent',
] as const;

/** An icon for what a stored `dependency` type drew as a diamond: its technology, else its span type. */
export const getLegacyDependencyIcon = (icon?: {
  span_type?: string;
  span_subtype?: string;
}): string => {
  const bySubtype: Record<string, string> = {
    elasticsearch: 'logoElasticsearch',
    postgresql: 'logoPostgres',
    postgres: 'logoPostgres',
    mysql: 'logoMySQL',
    mongodb: 'logoMongodb',
    redis: 'logoRedis',
    memcached: 'logoMemcached',
    kafka: 'logoKafka',
    rabbitmq: 'logoRabbitmq',
  };
  const byType: Record<string, string> = {
    db: 'database',
    cache: 'database',
    messaging: 'package',
    storage: 'storage',
    external: 'globe',
  };
  return (
    bySubtype[(icon?.span_subtype ?? '').toLowerCase()] ??
    byType[(icon?.span_type ?? '').toLowerCase()] ??
    'globe'
  );
};

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
  if (next.kind === 'dependency') {
    next = {
      ...next,
      kind: 'infrastructure',
      icon: { ...next.icon, eui_icon: next.icon?.eui_icon ?? getLegacyDependencyIcon(next.icon) },
    };
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

/** Real infrastructure that is not a database or a Kubernetes object: a place, a network, a team. */
const infraType = (
  id: string,
  label: string,
  euiIcon: string,
  description: string,
  fields: ImpactMapMetadataField[] = []
): ImpactMapEntityType => ({
  id,
  label,
  kind: 'infrastructure',
  icon: { eui_icon: euiIcon },
  description,
  ...(fields.length > 0 ? { metadata_fields: uniqueFields(fields) } : {}),
});

const serviceType = (id: string, label: string, agentName?: string): ImpactMapEntityType => ({
  id,
  label,
  kind: 'service',
  ...(agentName ? { icon: { agent_name: agentName } } : {}),
  description: 'Application code you run.',
  // service.name is the entity's own name, so it is not repeated as a field. Where it runs
  // (cluster, namespace, deployment, pod, node, cloud) is what a person needs to find it.
  metadata_fields: uniqueFields([
    field('deployment.environment.name', true),
    field('service.environment', true),
    field('k8s.cluster.name', true),
    field('k8s.namespace.name', true),
    field('service.namespace'),
    field('service.version'),
    field('service.instance.id'),
    field('service.node.name'),
    field('service.runtime.name'),
    field('service.runtime.version'),
    field('service.framework.name'),
    field('telemetry.sdk.language'),
    field('telemetry.sdk.name'),
    field('telemetry.sdk.version'),
    field('agent.name'),
    field('agent.version'),
    field('k8s.deployment.name'),
    field('k8s.pod.name'),
    field('k8s.node.name'),
    field('host.name'),
    field('container.image.name'),
    field('container.image.tag'),
    field('cloud.provider'),
    field('cloud.region'),
    field('team.owner'),
  ]),
});

const dependencyType = (
  id: string,
  label: string,
  euiIcon: string,
  fields: ImpactMapMetadataField[]
): ImpactMapEntityType => ({
  id,
  label,
  kind: 'infrastructure',
  icon: { eui_icon: euiIcon },
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
  infraType('database', 'Database', 'database', 'A database whose engine is not known.', [
    field('db.namespace', true),
    field('db.system.name'),
  ]),
  infraType(
    'group',
    'Group',
    'nested',
    'A set of entities drawn together because they share something: a business service, a tier, a failure domain.',
    []
  ),
  // Where things are and how they connect: a map of any system needs these before any service.
  infraType(
    'cloud.region',
    'Cloud region',
    'mapMarker',
    'A cloud provider region, or a data centre site.',
    [field('cloud.provider', true), field('cloud.region', true)]
  ),
  infraType(
    'cloud.availability_zone',
    'Availability zone',
    'mapMarker',
    'One failure domain in a region: a zone, a rack, a power or network domain.',
    [
      field('cloud.provider', true),
      field('cloud.region', true),
      field('cloud.availability_zone', true),
    ]
  ),
  infraType('data_center', 'Data center', 'home', 'A physical site or room that hosts machines.', [
    field('data_center.name', true, 'Data center'),
  ]),
  infraType('network', 'Network', 'link', 'A network, VPC, VLAN or subnet that entities share.', [
    field('network.name', true, 'Network'),
    field('network.cidr', true, 'Address range'),
  ]),
  infraType(
    'network.firewall_rule',
    'Firewall rule',
    'shield',
    'A security group, network policy or firewall rule that allows or blocks traffic.',
    [field('network.rule.name', true, 'Rule'), field('network.rule.action', false, 'Action')]
  ),
  infraType(
    'network.load_balancer',
    'Load balancer',
    'merge',
    'A load balancer, ingress, proxy or API gateway that spreads or routes traffic.',
    [field('network.name'), field('url.domain', true, 'Address')]
  ),
  infraType(
    'cloud.service',
    'Managed cloud service',
    'logoCloud',
    'A service the cloud provider runs for you, such as a managed database, queue or identity service, with limits you can hit.',
    [field('cloud.provider', true), field('cloud.platform', true), field('cloud.region')]
  ),
  infraType('storage.bucket', 'Object storage', 'storage', 'A bucket or blob container.', [
    field('cloud.provider', true),
    field('cloud.region'),
  ]),
  infraType('messaging.queue', 'Queue or topic', 'package', 'A queue, topic or event stream.', [
    field('messaging.system', true),
    field('messaging.destination.name', true),
  ]),
  infraType(
    'controller',
    'Controller',
    'gear',
    'Software that keeps a system in its desired state: a Kubernetes operator, scheduler, autoscaler or control-plane component. Draw it when it acts on, or fails to act on, what broke.',
    [field('k8s.cluster.name', true), field('service.version')]
  ),
  infraType(
    'environment',
    'Environment',
    'layers',
    'A deployment environment, slice or tenant: production, staging, a customer cell.',
    [field('deployment.environment.name', true)]
  ),
  infraType(
    'release',
    'Release or version',
    'tag',
    'A software version or build that many entities run. Group by it to find a bad release.',
    [field('service.version', true, 'Version'), field('vcs.revision', false, 'Revision')]
  ),
  infraType(
    'pipeline',
    'Pipeline',
    'branch',
    'A CI/CD or GitOps pipeline that builds, renders or deploys other entities.',
    [field('cicd.pipeline.name', true, 'Pipeline')]
  ),
  infraType('repository', 'Repository', 'logoGithub', 'A source or configuration repository.', [
    field('vcs.repository.url.full', true, 'URL'),
  ]),
  infraType(
    'team',
    'Team',
    'users',
    'The team that owns, runs or can be paged for other entities. Link it with owned_by.',
    [field('team.name', true, 'Team'), field('team.oncall', false, 'On call')]
  ),
  serviceType('service', 'Service'),
  serviceType('nodejs_service', 'Node.js service', 'nodejs'),
  serviceType('java_service', 'Java service', 'java'),
  serviceType('go_service', 'Go service', 'go'),
  serviceType('python_service', 'Python service', 'python'),
  serviceType('dotnet_service', '.NET service', 'dotnet'),
  dependencyType('db.postgresql', 'PostgreSQL', 'logoPostgres', [
    field('db.namespace', true),
    field('db.system.name'),
  ]),
  dependencyType('db.mysql', 'MySQL', 'logoMySQL', [
    field('db.namespace', true),
    field('db.system.name'),
  ]),
  dependencyType('db.elasticsearch', 'Elasticsearch', 'logoElasticsearch', [
    field('db.namespace'),
    field('db.system.name'),
  ]),
  dependencyType('db.redis', 'Redis', 'logoRedis', [field('db.system.name')]),
  dependencyType('messaging.kafka', 'Kafka topic', 'logoKafka', [
    field('messaging.destination.name', true),
    field('messaging.system'),
  ]),
  dependencyType('gen_ai.provider', 'Generative AI provider', 'globe', [
    field('gen_ai.provider.name', true),
    field('gen_ai.request.model'),
  ]),
  dependencyType('external_api', 'External API', 'globe', [field('url.full')]),
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
  relationshipType('owned_by', 'OWNED_BY'),
  relationshipType('routes_to', 'ROUTES_TO'),
  relationshipType('replicates_to', 'REPLICATES_TO'),
  relationshipType('managed_by', 'MANAGED_BY'),
  relationshipType('deployed_by', 'DEPLOYED_BY'),
  relationshipType('connects_to', 'CONNECTS_TO'),
  relationshipType('blocked_by', 'BLOCKED_BY'),
];

/** The types in code, as a catalog. */
export const BUILT_IN_CATALOG: ImpactMapCatalog = {
  entity_types: [...BUILT_IN_ENTITY_TYPES],
  relationship_types: [...BUILT_IN_RELATIONSHIP_TYPES],
};

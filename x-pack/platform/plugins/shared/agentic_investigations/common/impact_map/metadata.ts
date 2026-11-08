/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImpactMapEntity,
  ImpactMapEntityType,
  ImpactMapMetadataEntry,
  ImpactMapMetadataField,
} from './impact_map';

/**
 * Fields that mean the same thing for any entity, named as the OpenTelemetry attribute registry
 * names them (https://opentelemetry.io/docs/specs/semconv/registry/entities/), and checked against
 * the attributes our OTel data carries, so the agent
 * reuses a key instead of inventing `az` or `zone` and the table stays comparable across
 * investigations. The ones that help someone find the entity are featured.
 */
export const STANDARD_METADATA_FIELDS: readonly ImpactMapMetadataField[] = [
  { key: 'cloud.provider', label: 'Cloud provider', featured: true },
  { key: 'cloud.platform', label: 'Cloud platform' },
  { key: 'cloud.region', label: 'Region', featured: true },
  { key: 'cloud.availability_zone', label: 'Availability zone', featured: true },
  { key: 'cloud.account.id', label: 'Cloud account' },
  { key: 'cloud.instance.id', label: 'Cloud instance' },
  { key: 'k8s.cluster.name', label: 'Kubernetes cluster', featured: true },
  { key: 'k8s.cluster.uid', label: 'Cluster UID' },
  { key: 'k8s.namespace.name', label: 'Namespace', featured: true },
  { key: 'k8s.namespace.uid', label: 'Namespace UID' },
  { key: 'k8s.node.name', label: 'Node' },
  { key: 'k8s.node.uid', label: 'Node UID' },
  { key: 'k8s.node.hostname', label: 'Node hostname' },
  { key: 'k8s.node.ip', label: 'Node IP' },
  { key: 'k8s.deployment.name', label: 'Deployment' },
  { key: 'k8s.deployment.uid', label: 'Deployment UID' },
  { key: 'k8s.statefulset.name', label: 'StatefulSet' },
  { key: 'k8s.statefulset.uid', label: 'StatefulSet UID' },
  { key: 'k8s.daemonset.name', label: 'DaemonSet' },
  { key: 'k8s.daemonset.uid', label: 'DaemonSet UID' },
  { key: 'k8s.replicaset.name', label: 'ReplicaSet' },
  { key: 'k8s.replicaset.uid', label: 'ReplicaSet UID' },
  { key: 'k8s.job.name', label: 'Job' },
  { key: 'k8s.job.uid', label: 'Job UID' },
  { key: 'k8s.cronjob.name', label: 'CronJob' },
  { key: 'k8s.cronjob.uid', label: 'CronJob UID' },
  { key: 'k8s.hpa.name', label: 'Autoscaler' },
  { key: 'k8s.hpa.uid', label: 'Autoscaler UID' },
  { key: 'k8s.resourcequota.name', label: 'Resource quota' },
  { key: 'k8s.resourcequota.uid', label: 'Resource quota UID' },
  { key: 'k8s.pod.name', label: 'Pod' },
  { key: 'k8s.pod.uid', label: 'Pod UID' },
  { key: 'k8s.pod.ip', label: 'Pod IP' },
  { key: 'k8s.container.name', label: 'Container name' },
  {
    key: 'k8s.container.status.last_terminated_reason',
    label: 'Last termination reason',
  },
  { key: 'app.label.name', label: 'App label' },
  { key: 'app.label.version', label: 'App label version' },
  { key: 'host.name', label: 'Host' },
  { key: 'host.id', label: 'Host ID' },
  { key: 'host.type', label: 'Instance type' },
  { key: 'host.arch', label: 'Architecture' },
  { key: 'os.type', label: 'OS' },
  { key: 'os.version', label: 'OS version' },
  { key: 'container.name', label: 'Container' },
  { key: 'container.id', label: 'Container ID' },
  { key: 'container.image.name', label: 'Container image' },
  { key: 'container.image.tag', label: 'Image tag' },
  { key: 'process.executable.name', label: 'Executable' },
  { key: 'process.pid', label: 'Process ID' },
  { key: 'process.command_line', label: 'Command line' },
  { key: 'process.owner', label: 'Process owner' },
  { key: 'service.name', label: 'Service name' },
  { key: 'service.namespace', label: 'Service namespace' },
  { key: 'service.version', label: 'Version' },
  { key: 'service.instance.id', label: 'Service instance' },
  { key: 'deployment.environment.name', label: 'Environment', featured: true },
  { key: 'telemetry.sdk.language', label: 'Language' },
  { key: 'db.system.name', label: 'Database system' },
  { key: 'db.namespace', label: 'Database name' },
  { key: 'messaging.system', label: 'Messaging system' },
  { key: 'messaging.destination.name', label: 'Topic or queue' },
  { key: 'gen_ai.provider.name', label: 'AI provider' },
  { key: 'gen_ai.request.model', label: 'Model' },
  { key: 'server.address', label: 'Address' },
  { key: 'server.port', label: 'Port' },
  { key: 'url.full', label: 'URL' },
  { key: 'team.owner', label: 'Owner' },
];

export interface EntityMetadataRow {
  key: string;
  label: string;
  value: string;
  description?: string;
  /** Leads the entity's flyout, not only its Metadata tab. */
  featured: boolean;
}

/**
 * An entity's metadata as rows to show. An entry's own label and featured flag win over the type's
 * field of the same key, which wins over the standard fields; a key nobody named is labelled with
 * itself. Featured fields come first.
 */
export const resolveEntityMetadata = (
  entity:
    | (Pick<ImpactMapEntity, 'metadata'> & Partial<Pick<ImpactMapEntity, 'id' | 'label'>>)
    | undefined,
  type?: Pick<ImpactMapEntityType, 'metadata_fields'>
): EntityMetadataRow[] => {
  const known = new Map<string, ImpactMapMetadataField>(
    STANDARD_METADATA_FIELDS.map((field) => [field.key, field])
  );
  type?.metadata_fields?.forEach((field) =>
    known.set(field.key, { ...known.get(field.key), ...field })
  );
  // A value that only repeats the entity's own name tells the reader nothing the title doesn't.
  const names = [entity?.label, entity?.id].map((name) => name?.trim().toLowerCase());
  const rows = (entity?.metadata ?? [])
    .filter(({ value }) => !names.includes(value.trim().toLowerCase()))
    .map(({ key, value, label, featured }: ImpactMapMetadataEntry, index) => {
      const field = known.get(key);
      return {
        index,
        row: {
          key,
          value,
          label: label ?? field?.label ?? key,
          ...(field?.description ? { description: field.description } : {}),
          featured: featured ?? field?.featured ?? false,
        },
      };
    });
  return rows
    .sort((a, b) => Number(b.row.featured) - Number(a.row.featured) || a.index - b.index)
    .map(({ row }) => row);
};

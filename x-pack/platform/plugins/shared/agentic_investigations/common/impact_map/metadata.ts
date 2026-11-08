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
 * Fields that mean the same thing for any entity, named as OpenTelemetry names them, so the agent
 * reuses a key instead of inventing `az` or `zone` and the table stays comparable across
 * investigations. The ones that help someone find the entity are featured.
 */
export const STANDARD_METADATA_FIELDS: readonly ImpactMapMetadataField[] = [
  { key: 'cloud.provider', label: 'Cloud provider', featured: true },
  { key: 'cloud.region', label: 'Region', featured: true },
  { key: 'cloud.availability_zone', label: 'Availability zone', featured: true },
  { key: 'cloud.account.id', label: 'Cloud account' },
  { key: 'k8s.cluster.name', label: 'Kubernetes cluster', featured: true },
  { key: 'k8s.namespace.name', label: 'Namespace', featured: true },
  { key: 'k8s.deployment.name', label: 'Deployment' },
  { key: 'k8s.statefulset.name', label: 'StatefulSet' },
  { key: 'k8s.daemonset.name', label: 'DaemonSet' },
  { key: 'k8s.pod.name', label: 'Pod' },
  { key: 'k8s.node.name', label: 'Node' },
  { key: 'host.name', label: 'Host' },
  { key: 'host.type', label: 'Instance type' },
  { key: 'container.name', label: 'Container' },
  { key: 'container.image.name', label: 'Container image' },
  { key: 'service.namespace', label: 'Service namespace' },
  { key: 'service.version', label: 'Version' },
  { key: 'deployment.environment.name', label: 'Environment', featured: true },
  { key: 'db.system.name', label: 'Database system' },
  { key: 'db.namespace', label: 'Database name' },
  { key: 'server.address', label: 'Address' },
  { key: 'server.port', label: 'Port' },
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
  entity: Pick<ImpactMapEntity, 'metadata'> | undefined,
  type?: Pick<ImpactMapEntityType, 'metadata_fields'>
): EntityMetadataRow[] => {
  const known = new Map<string, ImpactMapMetadataField>(
    STANDARD_METADATA_FIELDS.map((field) => [field.key, field])
  );
  type?.metadata_fields?.forEach((field) =>
    known.set(field.key, { ...known.get(field.key), ...field })
  );
  const rows = (entity?.metadata ?? []).map(
    ({ key, value, label, featured }: ImpactMapMetadataEntry, index) => {
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
    }
  );
  return rows
    .sort((a, b) => Number(b.row.featured) - Number(a.row.featured) || a.index - b.index)
    .map(({ row }) => row);
};

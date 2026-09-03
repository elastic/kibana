/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_SOURCES_MANAGED_BY = 'streams-sources';

export const MANAGED_SOURCE_TYPE_SLUGS = ['otlp', 'async-bulk', 'prometheus-remote-write'] as const;

export const DIRECT_SOURCE_TYPE_SLUGS = ['es-otlp', 'bulk', 'es-prometheus-remote-write'] as const;

export type ManagedSourceTypeSlug = (typeof MANAGED_SOURCE_TYPE_SLUGS)[number];
export type DirectSourceTypeSlug = (typeof DIRECT_SOURCE_TYPE_SLUGS)[number];
export type SourceTypeSlug = ManagedSourceTypeSlug | DirectSourceTypeSlug;

// TODO: Temporary until we can use "ingest" https://github.com/elastic/hosted-otel-collector/pull/3729
export const SOURCE_API_KEY_APPLICATION = 'apm';
export const SOURCE_API_KEY_APPLICATION_PRIVILEGE = 'write';
export const SOURCE_API_KEY_CLUSTER_PRIVILEGE = 'manage_own_api_key';

const DIRECT_SOURCE_TYPES = new Set<SourceTypeSlug>(DIRECT_SOURCE_TYPE_SLUGS);

export const isDirectSourceTypeSlug = (sourceTypeSlug: SourceTypeSlug): boolean =>
  DIRECT_SOURCE_TYPES.has(sourceTypeSlug);

export const createSourceResource = (sourceId: string): string => `source:${sourceId}`;

export interface SourceApiKeyWriterPrivileges {
  applications?: Array<{
    application: typeof SOURCE_API_KEY_APPLICATION;
    privileges: Array<typeof SOURCE_API_KEY_APPLICATION_PRIVILEGE>;
    resources: string[];
  }>;
  indices?: Array<{
    names: string[];
    privileges: string[];
  }>;
}

export const createSourceApiKeyRoleDescriptors = ({
  sourceTypeSlug,
  sourceResource,
}: {
  sourceTypeSlug: SourceTypeSlug;
  sourceResource: string;
}): { streams_source_writer: SourceApiKeyWriterPrivileges } => {
  if (isDirectSourceTypeSlug(sourceTypeSlug)) {
    return {
      streams_source_writer: {
        indices: [
          {
            // TODO: This is intentionally broad until Sources supports configuring target indices.
            names: ['*'],
            privileges: ['auto_configure', 'write'],
          },
        ],
      },
    };
  }

  return {
    streams_source_writer: {
      applications: [
        {
          application: SOURCE_API_KEY_APPLICATION,
          privileges: [SOURCE_API_KEY_APPLICATION_PRIVILEGE],
          resources: [sourceResource],
        },
      ],
    },
  };
};

export const createSourceApiKeyPrivilegeCheck = ({
  sourceTypeSlug,
  sourceResource,
}: {
  sourceTypeSlug: SourceTypeSlug;
  sourceResource: string;
}) => {
  const { streams_source_writer: writer } = createSourceApiKeyRoleDescriptors({
    sourceTypeSlug,
    sourceResource,
  });

  return {
    cluster: [SOURCE_API_KEY_CLUSTER_PRIVILEGE],
    ...(writer.applications ? { application: writer.applications } : {}),
    ...(writer.indices ? { index: writer.indices } : {}),
  };
};

export type SourceApiKeyPrivilegeFailure = 'none' | 'cluster' | 'source';

export interface SourceApiKeyPrivilegeResult {
  canCreate: boolean;
  canList: boolean;
  failure: SourceApiKeyPrivilegeFailure;
}

export const interpretSourceApiKeyPrivileges = ({
  hasAllRequested,
  canManageApiKeys,
}: {
  hasAllRequested: boolean;
  canManageApiKeys: boolean;
}): SourceApiKeyPrivilegeResult => {
  if (!canManageApiKeys) {
    return { canCreate: false, canList: false, failure: 'cluster' };
  }
  if (!hasAllRequested) {
    return { canCreate: false, canList: true, failure: 'source' };
  }
  return { canCreate: true, canList: true, failure: 'none' };
};

export const isOwnedBySource = ({
  metadata,
  sourceResource,
}: {
  metadata: Record<string, unknown> | undefined;
  sourceResource: string;
}): boolean =>
  metadata?.managed_by === STREAMS_SOURCES_MANAGED_BY &&
  metadata?.source_resource === sourceResource;

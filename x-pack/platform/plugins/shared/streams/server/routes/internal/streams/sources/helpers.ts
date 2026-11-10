/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitApiKey } from '../../../../lib/unit_config/unit_api_keys';

export const STREAMS_SOURCES_MANAGED_BY = 'streams-sources';

export const MANAGED_SOURCE_TYPE_SLUGS = ['otlp', 'async-bulk', 'prometheus-remote-write'] as const;

export const DIRECT_SOURCE_TYPE_SLUGS = ['es-otlp', 'bulk', 'es-prometheus-remote-write'] as const;

export type ManagedSourceTypeSlug = (typeof MANAGED_SOURCE_TYPE_SLUGS)[number];
export type DirectSourceTypeSlug = (typeof DIRECT_SOURCE_TYPE_SLUGS)[number];
export type SourceTypeSlug = ManagedSourceTypeSlug | DirectSourceTypeSlug;

export const SOURCE_API_KEY_APPLICATION = 'streams';
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

/**
 * `source`: a managed source type, missing the `streams` application `write` privilege on `source:<id>`.
 * `index`: a direct source type, missing the index privileges its key writes with.
 */
export type SourceApiKeyPrivilegeFailure = 'none' | 'cluster' | 'source' | 'index';

export interface SourceApiKeyPrivilegeResult {
  canCreate: boolean;
  failure: SourceApiKeyPrivilegeFailure;
}

export const interpretSourceApiKeyPrivileges = ({
  sourceTypeSlug,
  hasAllRequested,
  canManageApiKeys,
}: {
  sourceTypeSlug: SourceTypeSlug;
  hasAllRequested: boolean;
  canManageApiKeys: boolean;
}): SourceApiKeyPrivilegeResult => {
  if (!canManageApiKeys) {
    return { canCreate: false, failure: 'cluster' };
  }
  if (!hasAllRequested) {
    return {
      canCreate: false,
      failure: isDirectSourceTypeSlug(sourceTypeSlug) ? 'index' : 'source',
    };
  }
  return { canCreate: true, failure: 'none' };
};

export const sourceApiKeyName = (sourceId: string): string => `stream-source-${sourceId}`;

export const isSourceApiKey =
  (sourceId: string) =>
  ({ component_type: componentType, component_id: componentId }: UnitApiKey): boolean =>
    componentType === 'source' && componentId === sourceId;

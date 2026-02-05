/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsByType } from './types';

export interface RequiredPermissions {
  cluster: string[];
  index: Record<string, string[]>;
}

export function mergeRequiredPermissions(permissions: RequiredPermissions[]): RequiredPermissions {
  const clusterSet = new Set<string>();
  const indexPermissions: Record<string, Set<string>> = {};

  permissions.forEach((permission) => {
    // Add cluster permissions to the set
    permission.cluster.forEach((perm) => clusterSet.add(perm));

    // Process index permissions
    Object.entries(permission.index).forEach(([index, perms]) => {
      if (!indexPermissions[index]) {
        indexPermissions[index] = new Set<string>();
      }
      perms.forEach((perm) => indexPermissions[index].add(perm));
    });
  });

  // Convert sets back to arrays for the return value
  const result: RequiredPermissions = {
    cluster: Array.from(clusterSet),
    index: {},
  };

  Object.entries(indexPermissions).forEach(([index, permSet]) => {
    result.index[index] = Array.from(permSet);
  });

  return result;
}

export function getRequiredPermissionsForActions({
  actionsByType,
  isServerless,
}: {
  actionsByType: ActionsByType;
  isServerless: boolean;
}): RequiredPermissions {
  const permissions: RequiredPermissions[] = [];

  const {
    upsert_component_template,
    delete_component_template,
    upsert_index_template,
    delete_index_template,
    upsert_ingest_pipeline,
    delete_ingest_pipeline,
    append_processor_to_ingest_pipeline,
    delete_processor_from_ingest_pipeline,
    upsert_datastream,
    update_lifecycle,
    rollover,
    update_default_ingest_pipeline,
    delete_datastream,
    update_data_stream_mappings,
    update_ingest_settings,
    // we don't need to validate permissions for these actions
    // since they are done by the kibana system user
    upsert_dot_streams_document,
    delete_dot_streams_document,
    delete_queries,
    unlink_assets,
    unlink_systems,
    unlink_features,
    update_failure_store,
    ...rest
  } = actionsByType;
  assertEmptyObject(rest);

  if (upsert_component_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (delete_component_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (upsert_index_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (delete_index_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (upsert_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (delete_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (append_processor_to_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (delete_processor_from_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (update_default_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (upsert_datastream.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    upsert_datastream.forEach((action) => {
      indexPermissions[action.request.name] = ['create_index'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (update_data_stream_mappings.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    update_data_stream_mappings.forEach((action) => {
      indexPermissions[action.request.name] = ['manage'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (update_lifecycle.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    update_lifecycle.forEach((action) => {
      indexPermissions[action.request.name] = isServerless
        ? ['manage_data_stream_lifecycle', 'manage']
        : ['manage_ilm', 'manage_data_stream_lifecycle', 'manage'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (rollover.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    rollover.forEach((action) => {
      indexPermissions[action.request.name] = ['manage'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (delete_datastream.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    delete_datastream.forEach((action) => {
      indexPermissions[action.request.name] = ['delete_index'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (update_ingest_settings.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    update_ingest_settings.forEach((action) => {
      indexPermissions[action.request.name] = ['manage'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  return mergeRequiredPermissions(permissions);
}

function assertEmptyObject(object: Record<string, never>) {
  // This is for type checking only
}

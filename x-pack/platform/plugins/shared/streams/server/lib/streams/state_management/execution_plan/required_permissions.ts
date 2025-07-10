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

export function getRequiredPermissionsForActions(actions: ActionsByType): RequiredPermissions {
  const permissions: RequiredPermissions[] = [];

  if (actions.upsert_component_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (actions.delete_component_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (actions.upsert_index_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (actions.delete_index_template.length > 0) {
    permissions.push({
      cluster: ['manage_index_templates'],
      index: {},
    });
  }

  if (actions.upsert_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (actions.delete_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (actions.append_processor_to_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (actions.delete_processor_from_ingest_pipeline.length > 0) {
    permissions.push({
      cluster: ['manage_pipeline'],
      index: {},
    });
  }

  if (actions.upsert_datastream.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    actions.upsert_datastream.forEach((action) => {
      indexPermissions[action.request.name] = ['create_index'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (actions.update_lifecycle.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    actions.update_lifecycle.forEach((action) => {
      indexPermissions[action.request.name] = [
        'manage_ilm',
        'manage_data_stream_lifecycle',
        'manage',
      ];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (actions.upsert_write_index_or_rollover.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    actions.upsert_write_index_or_rollover.forEach((action) => {
      indexPermissions[action.request.name] = ['manage'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  if (actions.delete_datastream.length > 0) {
    const indexPermissions: Record<string, string[]> = {};
    actions.delete_datastream.forEach((action) => {
      indexPermissions[action.request.name] = ['delete_index'];
    });
    permissions.push({
      cluster: [],
      index: indexPermissions,
    });
  }

  return mergeRequiredPermissions(permissions);
}

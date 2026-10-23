/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { AGENT_ACTIONS_INDEX } from '../../../common';

import { escapeSearchQueryPhrase } from '../saved_object';

import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_INDEX,
  ASSETS_SAVED_OBJECT_TYPE,
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_INDEX,
  FLEET_PROXY_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  FLEET_SETUP_LOCK_TYPE,
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
  OUTPUT_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
} from '../../constants';

import { addNamespaceFilteringToQuery } from '../spaces/query_namespaces_filtering';

/**
 * Explicit allowlist of indices the Fleet debug index route may access.
 * These are the same three indices offered in the Fleet debug UI.
 * Using an allowlist rather than a prefix check limits the attack surface
 * independently of any caller-space scoping.
 */
const FLEET_DEBUG_ALLOWED_INDICES = new Set([
  AGENTS_INDEX,
  AGENT_ACTIONS_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
]);

/** Fleet-owned saved object types supported by the Fleet debug saved_objects routes. */
const FLEET_DEBUG_ALLOWED_SO_TYPES = new Set([
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  ASSETS_SAVED_OBJECT_TYPE,
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  FLEET_PROXY_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  FLEET_SETUP_LOCK_TYPE,
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
  OUTPUT_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
]);

export function isIndexAllowedForDebug(index: string): boolean {
  return FLEET_DEBUG_ALLOWED_INDICES.has(index.trim());
}

export function isSavedObjectTypeAllowedForDebug(type: string): boolean {
  return FLEET_DEBUG_ALLOWED_SO_TYPES.has(type);
}

export type DebugResult<T> = { ok: true; body: T } | { ok: false; body: { message: string } };

export async function fetchIndex(
  esClient: ElasticsearchClient,
  index: string,
  spaceId?: string
): Promise<DebugResult<Awaited<ReturnType<ElasticsearchClient['search']>>>> {
  if (!isIndexAllowedForDebug(index)) {
    return { ok: false, body: { message: 'Index not allowed for debug.' } };
  }
  const query = await addNamespaceFilteringToQuery({ bool: {} }, spaceId);
  const body = await esClient.search({ index, query });
  return { ok: true, body };
}

export async function fetchSavedObjects(
  soClient: SavedObjectsClientContract,
  type: string,
  name: string
): Promise<DebugResult<Awaited<ReturnType<SavedObjectsClientContract['find']>>>> {
  if (!isSavedObjectTypeAllowedForDebug(type)) {
    return { ok: false, body: { message: 'Saved object type not allowed for debug.' } };
  }
  const body = await soClient.find({
    type,
    search: escapeSearchQueryPhrase(name),
    searchFields: ['name'], // SO type automatically inferred
  });
  return { ok: true, body };
}

export async function fetchSavedObjectNames(
  soClient: SavedObjectsClientContract,
  type: string
): Promise<DebugResult<Awaited<ReturnType<SavedObjectsClientContract['find']>>>> {
  if (!isSavedObjectTypeAllowedForDebug(type)) {
    return { ok: false, body: { message: 'Saved object type not allowed for debug.' } };
  }
  const body = await soClient.find({
    type,
    aggs: {
      names: {
        terms: { field: `${type}.attributes.name` }, // cf. SavedObjectsFindOptions definition in src/core/packages/saved-objects/api-server/src/apis/find.ts
      },
    },
  });
  return { ok: true, body };
}

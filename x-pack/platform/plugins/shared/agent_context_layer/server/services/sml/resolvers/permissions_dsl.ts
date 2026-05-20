/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CheckPrivilegesPayload } from '@kbn/security-plugin-types-server';

/**
 * Classification of a single permission string stored on an SML document.
 *
 * The SML index stores permissions as plain `keyword` strings, but resolvers
 * may produce both Kibana privileges and Elasticsearch cluster/index
 * privileges. We encode the kind of each permission in the string itself via
 * a small DSL so the security check at search time can dispatch correctly.
 *
 * Strings without a recognised prefix are treated as Kibana privileges
 * (backward-compat with SML types written before resolvers existed).
 */
export type ClassifiedPermission =
  | { kind: 'kibana'; value: string; raw: string }
  | { kind: 'es-cluster'; value: string; raw: string }
  | { kind: 'es-index'; index: string; value: string; raw: string };

const KIBANA_PREFIX = 'kibana:';
const ES_CLUSTER_PREFIX = 'es-cluster:';
const ES_INDEX_PREFIX = 'es-index:';

/**
 * Classify a single stored permission string into one of the three buckets
 * understood by `security.authz.checkPrivilegesDynamicallyWithRequest`.
 *
 * `raw` is the original string as stored on the SML document; it is used to
 * reconstruct the set of authorized stored values after the check round-trip.
 */
export const classifyPermission = (raw: string): ClassifiedPermission => {
  if (raw.startsWith(ES_CLUSTER_PREFIX)) {
    return { kind: 'es-cluster', value: raw.slice(ES_CLUSTER_PREFIX.length), raw };
  }
  if (raw.startsWith(ES_INDEX_PREFIX)) {
    const rest = raw.slice(ES_INDEX_PREFIX.length);
    const sep = rest.indexOf(':');
    if (sep > 0) {
      return {
        kind: 'es-index',
        index: rest.slice(0, sep),
        value: rest.slice(sep + 1),
        raw,
      };
    }
    // Malformed `es-index:` value (missing privilege after index). Fall back
    // to treating it as a Kibana privilege so we don't silently drop it.
  }
  if (raw.startsWith(KIBANA_PREFIX)) {
    return { kind: 'kibana', value: raw.slice(KIBANA_PREFIX.length), raw };
  }
  return { kind: 'kibana', value: raw, raw };
};

/**
 * Build a `CheckPrivilegesPayload` from a flat list of stored permission
 * strings. The payload can be passed directly to
 * `securityAuthz.checkPrivilegesDynamicallyWithRequest(request)({ ... })`.
 *
 * Duplicates are removed per bucket; the relative order of distinct
 * privileges is preserved (useful for predictable test snapshots).
 */
export const buildCheckPrivilegesPayload = (
  permissions: string[]
): { payload: CheckPrivilegesPayload; classified: ClassifiedPermission[] } => {
  const classified = permissions.map(classifyPermission);

  const kibana: string[] = [];
  const cluster: string[] = [];
  const index: Record<string, string[]> = {};

  const seenKibana = new Set<string>();
  const seenCluster = new Set<string>();
  const seenIndex = new Map<string, Set<string>>();

  for (const item of classified) {
    if (item.kind === 'kibana') {
      if (!seenKibana.has(item.value)) {
        seenKibana.add(item.value);
        kibana.push(item.value);
      }
    } else if (item.kind === 'es-cluster') {
      if (!seenCluster.has(item.value)) {
        seenCluster.add(item.value);
        cluster.push(item.value);
      }
    } else {
      let seenForIndex = seenIndex.get(item.index);
      if (!seenForIndex) {
        seenForIndex = new Set<string>();
        seenIndex.set(item.index, seenForIndex);
      }
      if (!seenForIndex.has(item.value)) {
        seenForIndex.add(item.value);
        (index[item.index] ??= []).push(item.value);
      }
    }
  }

  const payload: CheckPrivilegesPayload = {};
  if (kibana.length > 0) {
    payload.kibana = kibana;
  }
  const hasEs = cluster.length > 0 || Object.keys(index).length > 0;
  if (hasEs) {
    payload.elasticsearch = { cluster, index };
  }

  return { payload, classified };
};

/**
 * Shape of the `privileges` field of the `CheckPrivilegesResponse` returned
 * by the security plugin. Inlined here so the helper does not need a direct
 * dependency on the response type.
 */
export interface CheckPrivilegesResponsePrivileges {
  kibana: Array<{ privilege: string; authorized: boolean }>;
  elasticsearch?: {
    cluster: Array<{ privilege: string; authorized: boolean }>;
    index: Record<string, Array<{ privilege: string; authorized: boolean }>>;
  };
}

/**
 * Given the classified permissions and the response from
 * `securityAuthz.checkPrivilegesDynamicallyWithRequest`, return the set of
 * *raw* permission strings (i.e. as stored on the SML document) that the
 * user is authorized for.
 *
 * This indirection lets callers compare an SML document's `permissions`
 * array directly against the returned set, regardless of which prefix
 * (or no prefix) the stored strings use.
 */
export const collectAuthorizedRawPermissions = (
  classified: ClassifiedPermission[],
  response: CheckPrivilegesResponsePrivileges
): Set<string> => {
  const authorizedKibana = new Set(
    response.kibana.filter((p) => p.authorized).map((p) => p.privilege)
  );
  const authorizedCluster = new Set(
    (response.elasticsearch?.cluster ?? []).filter((p) => p.authorized).map((p) => p.privilege)
  );
  const authorizedIndex = new Map<string, Set<string>>();
  for (const [indexName, privs] of Object.entries(response.elasticsearch?.index ?? {})) {
    authorizedIndex.set(
      indexName,
      new Set(privs.filter((p) => p.authorized).map((p) => p.privilege))
    );
  }

  const authorizedRaw = new Set<string>();
  for (const item of classified) {
    let isAuthorized = false;
    if (item.kind === 'kibana') {
      isAuthorized = authorizedKibana.has(item.value);
    } else if (item.kind === 'es-cluster') {
      isAuthorized = authorizedCluster.has(item.value);
    } else {
      isAuthorized = authorizedIndex.get(item.index)?.has(item.value) ?? false;
    }
    if (isAuthorized) {
      authorizedRaw.add(item.raw);
    }
  }
  return authorizedRaw;
};

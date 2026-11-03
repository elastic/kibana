/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core-http-server';
import { of } from 'rxjs';
import { TaskPodUnsupportedError } from '../errors';

/**
 * Who a task's fake request acts for. Kibana resolves the originating user (name and profile) when
 * the task is scheduled and sends it with each run; the pod attaches it to the request, as the
 * Security plugin's fake-request enrichment does, so `getCurrentUser` stays synchronous and needs no
 * round trip to Elasticsearch.
 */
const requestUsers = new WeakMap<object, { username?: string; profile_uid?: string }>();

export const enrichPodFakeRequest = (
  request: KibanaRequest,
  { profileId, username }: { profileId?: string; username?: string }
) => {
  requestUsers.set(request, { username, profile_uid: profileId });
};

export const getPodRequestUser = (request: KibanaRequest) => {
  const user = requestUsers.get(request);
  return user?.username || user?.profile_uid ? user : null;
};

/**
 * UIAM (serverless) key invalidation needs the UIAM client credentials only Kibana holds, so a pod
 * can't do it. It fails, so the pending record is kept and retried by a node that can, rather than
 * being dropped with the key still active.
 */
const uiamInvalidate = async () => {
  throw new Error('UIAM API key invalidation is not supported in a task pod');
};

/**
 * Whether API keys can be created: Elasticsearch answers a harmless invalidation of a key that
 * doesn't exist, unless security or API keys are off (what the Security plugin does too).
 */
const areAPIKeysEnabled = (client: Client) => async () => {
  try {
    await client.security.invalidateApiKey({ ids: ['kibana-api-key-service-test'] });
    return true;
  } catch (error) {
    const reason = (error as { message?: string }).message ?? '';
    if (/api keys are not enabled|security.*(disabled|not enabled)/i.test(reason)) return false;
    throw error;
  }
};

/**
 * An independent copy of the request's API key (same role descriptors, no expiration), owned by
 * Task Manager: what a task scheduled from a request needs so it can outlive the request's key.
 * The same Elasticsearch call the Security plugin makes.
 */
const cloneAsInternalUser =
  (client: Client) =>
  async (
    request: KibanaRequest,
    {
      name,
      metadata,
      refresh,
    }: { name: string; metadata?: Record<string, unknown>; refresh?: boolean }
  ) => {
    const authorization = request.headers?.authorization;
    const [scheme, credentials] =
      typeof authorization === 'string' ? authorization.split(/\s+/) : [];
    if (!credentials) {
      throw new Error(
        'Unable to clone an API key, request does not contain an authorization header'
      );
    }
    if (scheme.toLowerCase() !== 'apikey') {
      throw new Error(
        `Unable to clone an API key, expected ApiKey authorization scheme but got "${scheme}"`
      );
    }
    return client.transport.request<{ id: string; name: string; api_key: string }>({
      method: 'POST',
      path: '/_security/api_key/clone',
      body: {
        api_key: credentials,
        name,
        // `metadata` must come before `expiration`: Elasticsearch drops the field after a null
        // `expiration` (https://github.com/elastic/elasticsearch/pull/152874).
        ...(metadata ? { metadata } : {}),
        expiration: null,
      },
      ...(refresh !== undefined ? { querystring: { refresh } } : {}),
    });
  };

export const createSecurityStart = (client: Client) => ({
  authc: {
    getCurrentUser: (request: KibanaRequest) => getPodRequestUser(request),
    getRedactedSessionId: () => undefined,
    apiKeys: {
      uiam: { invalidate: uiamInvalidate },
      areAPIKeysEnabled: areAPIKeysEnabled(client),
      cloneAsInternalUser: cloneAsInternalUser(client),
    },
  },
  // Service accounts need Kibana's bindings and the security plugin: a pod runs none of them. A
  // task that would use one fails here with a clear message instead of a missing method.
  serviceAccounts: {
    isEnabled: () => false,
    getWorkloadBinding: async () => undefined,
    withScopedRequestForWorkload: () => {
      throw new TaskPodUnsupportedError('service account execution');
    },
    bindWorkload: () => {
      throw new TaskPodUnsupportedError('service account bindings');
    },
    unbindWorkload: () => {
      throw new TaskPodUnsupportedError('service account bindings');
    },
  },
  audit: { asScoped: () => ({ log: () => undefined, enabled: false }) },
});

/** The id inside an `ApiKey <base64(id:secret)>` header, which is how a task's own key arrives. */
const extractApiKeyId = (authorization: unknown): string | undefined => {
  if (typeof authorization !== 'string') return undefined;
  const [scheme, credentials] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'apikey' || !credentials) return undefined;
  const [id, secret] = Buffer.from(credentials, 'base64').toString().split(':');
  return id && secret ? id : undefined;
};

/**
 * The profile of the user behind a request: what Kibana enriched the request with, or, for a bare
 * API-key request, the profile Elasticsearch links to that key, asked as the key itself (the same
 * lookup the Security plugin does). Without a profile, tasks that check ownership treat the request
 * as anonymous, so private workflows owned by the key's user would not be found.
 */
export const createUserProfileStart = (client: Client) => ({
  getCurrentProfileId: async ({ request }: { request: KibanaRequest }) => {
    const enriched = getPodRequestUser(request)?.profile_uid;
    if (enriched) return enriched;
    const id = extractApiKeyId(request.headers?.authorization);
    if (!id) return null;
    try {
      const scoped = client.child({
        headers: { authorization: request.headers.authorization as string },
      });
      const response = await scoped.security.getApiKey({ id, with_profile_uid: true });
      return response.api_keys?.[0]?.profile_uid ?? null;
    } catch {
      return null;
    }
  },
});

/** Feature flags have no evaluation backend in a pod, so every flag resolves to its fallback. */
/**
 * Feature flags resolve to their fallbacks, except where a pod has to differ from Kibana: workflows
 * must go through Core's self client for Kibana API calls, which a pod does not have, so those calls
 * fail with an explicit error instead of reaching a Kibana through the legacy fetch.
 */
const POD_FLAG_OVERRIDES: Record<string, unknown> = {
  'workflows.kibanaRequest.coreSelfClientEnabled': true,
};

export const createFeatureFlagsStart = () => {
  const value = <T>(flag: string, fallback: T) =>
    flag in POD_FLAG_OVERRIDES ? (POD_FLAG_OVERRIDES[flag] as T) : fallback;
  return {
    getStringValue: async (flag: string, fallback: string) => value(flag, fallback),
    getBooleanValue: async (flag: string, fallback: boolean) => value(flag, fallback),
    getNumberValue: async (flag: string, fallback: number) => value(flag, fallback),
    getStringValue$: (flag: string, fallback: string) => of(value(flag, fallback)),
    getBooleanValue$: (flag: string, fallback: boolean) => of(value(flag, fallback)),
    getNumberValue$: (flag: string, fallback: number) => of(value(flag, fallback)),
  };
};

/** UI settings registered by plugins during setup; values resolve to their registered defaults. */
export const createUiSettings = () => {
  const registered = new Map<string, { value?: unknown }>();
  const get = async (key: string) => registered.get(key)?.value;
  return {
    setup: {
      register: (settings: Record<string, { value?: unknown }>) => {
        for (const [key, setting] of Object.entries(settings)) registered.set(key, setting);
      },
    },
    start: {
      asScopedToClient: () => ({
        get,
        getAll: async () => Object.fromEntries([...registered].map(([k, s]) => [k, s.value])),
        getRegistered: () => Object.fromEntries(registered),
      }),
    },
  };
};

/** Telemetry is not shipped from a pod: event types are accepted and events are dropped. */
export const createAnalytics = () => ({
  setup: {
    registerEventType: () => undefined,
    registerContextProvider: () => undefined,
    registerShipper: () => undefined,
  },
  start: { reportEvent: () => undefined, telemetryCounter$: of() },
});

/**
 * The slice of Core's HTTP start a task uses to build links back to Kibana. A pod serves no Kibana
 * routes, so it takes the same `server.*` keys Kibana's config has: set `server.publicBaseUrl` to
 * how users reach Kibana, or the URL falls back to `server.host`/`server.port` like Kibana's own.
 */
export const createHttpStart = (config: Record<string, unknown>) => {
  const server = ((config.server as Record<string, unknown> | undefined) ?? {}) as {
    publicBaseUrl?: string;
    basePath?: string;
    host?: string;
    port?: number;
  };
  const serverBasePath = server.basePath ?? '';
  return {
    basePath: {
      publicBaseUrl: server.publicBaseUrl,
      serverBasePath,
      prepend: (path: string) => `${serverBasePath}${path}`,
    },
    getServerInfo: () => ({
      name: 'kibana',
      protocol: 'http' as const,
      hostname: server.host ?? 'localhost',
      port: server.port ?? 5601,
    }),
  };
};

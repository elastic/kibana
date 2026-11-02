/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { of } from 'rxjs';
import { isExternalUiamCredential } from '@kbn/core-security-server';
import { callKibana } from '../remote';
import { setPodRequestExtrasReader } from '../../wire';

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

// A request passed to a Kibana contract keeps its user and UIAM verdict.
setPodRequestExtrasReader((request) => {
  const user = requestUsers.get(request);
  return {
    ...(user?.profile_uid ? { userProfileId: user.profile_uid } : {}),
    ...(user?.username ? { userName: user.username } : {}),
    ...(isExternalUiamCredential(request as KibanaRequest) ? { uiamApiKeyExternal: true } : {}),
  };
});

/**
 * UIAM (serverless) key invalidation is Security's job in Kibana; the pod forwards it, with the
 * request carrying the key's credentials, and Kibana answers `null` when UIAM isn't configured.
 */
const remoteUiamInvalidate = (request: KibanaRequest, params: { id: string }) =>
  callKibana('taskManager', 'uiamInvalidateApiKey', [request, params]);

export const createSecurityStart = () => ({
  authc: {
    getCurrentUser: (request: KibanaRequest) => getPodRequestUser(request),
    getRedactedSessionId: () => undefined,
    // Plugin-level invalidation of regular API keys is in the Security pod plugin.
    apiKeys: { uiam: { invalidate: remoteUiamInvalidate } },
  },
  audit: { asScoped: () => ({ log: () => undefined, enabled: false }) },
});

/** API-key-authenticated requests have no activated user profile in Kibana either. */
export const createUserProfileStart = () => ({
  getCurrentProfileId: async (request: KibanaRequest) =>
    getPodRequestUser(request)?.profile_uid ?? null,
});

/** Feature flags have no evaluation backend in a pod, so every flag resolves to its fallback. */
export const createFeatureFlagsStart = () => ({
  getStringValue: async (_flag: string, fallback: string) => fallback,
  getBooleanValue: async (_flag: string, fallback: boolean) => fallback,
  getNumberValue: async (_flag: string, fallback: number) => fallback,
  getStringValue$: (_flag: string, fallback: string) => of(fallback),
  getBooleanValue$: (_flag: string, fallback: boolean) => of(fallback),
  getNumberValue$: (_flag: string, fallback: number) => of(fallback),
});

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

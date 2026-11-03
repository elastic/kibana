/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import { AnalyticsService } from '@kbn/core-analytics-server-internal';
import { featureFlagsConfig, FeatureFlagsService } from '@kbn/core-feature-flags-server-internal';
import { SecurityService } from '@kbn/core-security-server-internal';
import { getDefaultSecurityImplementation } from '@kbn/core-security-server-internal/src/utils';
import { UserProfileService } from '@kbn/core-user-profile-server-internal';
import { getDefaultUserProfileImplementation } from '@kbn/core-user-profile-server-internal/src/utils';
import { uiSettingsConfig, UiSettingsService } from '@kbn/core-ui-settings-server-internal';
import { BasePath } from '@kbn/core-http-server-internal/src/base_path_service';
import { TaskPodUnsupportedError } from '../errors';

/**
 * A router that accepts and drops every route. Core services register HTTP routes in `setup`
 * (UI settings API, feature flag counters); a pod has no HTTP server for them.
 */
const createNoopRouter = (): unknown => {
  const noop: unknown = new Proxy(() => noop, { get: () => noop, apply: () => noop });
  return noop;
};
const noopHttpSetup = { createRouter: () => createNoopRouter() } as never;

// Feature flags a pod forces on regardless of the flag provider (Kibana has none either way).
const POD_FEATURE_FLAG_OVERRIDES = { 'workflows.kibanaRequest.coreSelfClientEnabled': true };

export const registerCoreConfigSchemas = (coreContext: CoreContext) => {
  coreContext.configService.setSchema(uiSettingsConfig.path, uiSettingsConfig.schema);
  coreContext.configService.setSchema(featureFlagsConfig.path, featureFlagsConfig.schema);
};

/** The default flag overrides of a pod, merged under the pod config's `feature_flags.overrides`. */
export const withPodFeatureFlagOverrides = (config: Record<string, unknown>) => {
  const section =
    (config.feature_flags as { overrides?: Record<string, unknown> } | undefined) ?? {};
  return {
    ...config,
    feature_flags: {
      ...section,
      overrides: { ...POD_FEATURE_FLAG_OVERRIDES, ...section.overrides },
    },
  };
};

// ---- Security: Core's SecurityService with the delegate a pod provides ------------------------

const requestUsers = new WeakMap<object, { username?: string; profile_uid?: string }>();

export const getPodRequestUser = (request: KibanaRequest) => {
  const user = requestUsers.get(request);
  return user?.username || user?.profile_uid ? user : null;
};

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

const cloneAsInternalUser =
  (client: Client): CoreSecurityDelegateContract['authc']['apiKeys']['cloneAsInternalUser'] =>
  async (request: KibanaRequest, { name, metadata, refresh }) => {
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
    }) as never;
  };

/**
 * What the security plugin provides to Core's `SecurityService` in Kibana. Everything not listed
 * keeps Core's default implementation (audit disabled, no UIAM). Nothing in a pod is a service
 * account: runs as one stay in Kibana, and a task that would use one fails with a clear message.
 */
const createSecurityDelegate = (client: Client): CoreSecurityDelegateContract => {
  const defaults = getDefaultSecurityImplementation();
  return {
    ...defaults,
    authc: {
      ...defaults.authc,
      getCurrentUser: (request) => getPodRequestUser(request) as never,
      apiKeys: {
        ...defaults.authc.apiKeys,
        areAPIKeysEnabled: areAPIKeysEnabled(client),
        cloneAsInternalUser: cloneAsInternalUser(client),
      },
    },
    serviceAccounts: {
      ...defaults.serviceAccounts,
      withScopedRequestForWorkload: () => {
        throw new TaskPodUnsupportedError('service account execution');
      },
      bindWorkload: () => {
        throw new TaskPodUnsupportedError('service account bindings');
      },
      unbindWorkload: () => {
        throw new TaskPodUnsupportedError('service account bindings');
      },
      getWorkloadBinding: async () => null,
    },
    // Task Manager binds a run's user to its fake request; the delegate's `getCurrentUser` reads it.
    fakeRequestEnricher: (
      request,
      { profileId, username }: { profileId?: string; username?: string }
    ) => {
      requestUsers.set(request, { username, profile_uid: profileId });
    },
  } as CoreSecurityDelegateContract;
};

const extractApiKeyId = (authorization: unknown): string | undefined => {
  if (typeof authorization !== 'string') return undefined;
  const [scheme, credentials] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'apikey' || !credentials) return undefined;
  const [id, secret] = Buffer.from(credentials, 'base64').toString().split(':');
  return id && secret ? id : undefined;
};

/** What the security plugin provides to Core's `UserProfileService`: the profile of a request's API key. */
const createUserProfileDelegate = (client: Client): CoreUserProfileDelegateContract => ({
  ...getDefaultUserProfileImplementation(),
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

// ---- The real services ------------------------------------------------------------------------

export class PodCoreServices {
  public readonly analytics: AnalyticsService;
  public readonly featureFlags: FeatureFlagsService;
  public readonly uiSettings: UiSettingsService;
  public readonly security: SecurityService;
  public readonly userProfile: UserProfileService;
  public readonly basePath: BasePath;

  constructor(coreContext: CoreContext, config: Record<string, unknown>) {
    this.analytics = new AnalyticsService(coreContext);
    this.featureFlags = new FeatureFlagsService(coreContext);
    this.uiSettings = new UiSettingsService(coreContext);
    this.security = new SecurityService(coreContext);
    this.userProfile = new UserProfileService(coreContext);
    const server =
      (config.server as { basePath?: string; publicBaseUrl?: string } | undefined) ?? {};
    this.basePath = new BasePath(server.basePath, server.publicBaseUrl);
  }

  public async setup({
    savedObjects,
    internalClient,
  }: {
    savedObjects: { registerType: (type: never) => void };
    internalClient: Client;
  }) {
    const analytics = this.analytics.setup();
    this.featureFlags.setup({ http: noopHttpSetup });
    await this.uiSettings.preboot();
    const uiSettings = await this.uiSettings.setup({
      http: noopHttpSetup,
      savedObjects: savedObjects as never,
    });
    const security = this.security.setup();
    security.registerSecurityDelegate(createSecurityDelegate(internalClient));
    this.userProfile.setup().registerUserProfileDelegate(createUserProfileDelegate(internalClient));
    return {
      analytics,
      uiSettings,
      enrichFakeRequest: security.acquireFakeRequestEnricher(),
    };
  }

  public async start() {
    return {
      analytics: this.analytics.start(),
      featureFlags: this.featureFlags.start(),
      uiSettings: await this.uiSettings.start(),
      security: this.security.start(),
      userProfile: this.userProfile.start(),
    };
  }

  public async stop() {
    await this.analytics.stop();
    this.uiSettings.stop();
    this.security.stop();
  }
}

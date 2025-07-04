/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';

interface Usage {
  auditLoggingEnabled: boolean;
  loginSelectorEnabled: boolean;
  accessAgreementEnabled: boolean;
  authProviderCount: number;
  enabledAuthProviders: string[];
  fipsModeEnabled: boolean;
  httpAuthSchemes: string[];
  sessionIdleTimeoutInMinutes: number;
  sessionLifespanInMinutes: number;
  sessionCleanupInMinutes: number;
  sessionConcurrentSessionsMaxSessions: number;
  anonymousCredentialType: string | undefined;
}

interface Deps {
  usageCollection?: UsageCollectionSetup;
  config: ConfigType;
  license: SecurityLicense;
}

// List of auth schemes collected from https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml
const WELL_KNOWN_AUTH_SCHEMES = [
  'basic',
  'bearer',
  'digest',
  'hoba',
  'mutual',
  'negotiate',
  'oauth',
  'scram-sha-1',
  'scram-sha-256',
  'vapid',
  'apikey', // not part of the spec, but used by the Elastic Stack for API Key authentication
];

export function registerSecurityUsageCollector({ usageCollection, config, license }: Deps): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const securityCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'security',
    isReady: () => license.isLicenseAvailable(),
    schema: {
      auditLoggingEnabled: {
        type: 'boolean',
        _meta: {
          description:
            'Indicates if audit logging is both enabled and supported by the current license.',
        },
      },
      loginSelectorEnabled: {
        type: 'boolean',
        _meta: {
          description: 'Indicates if the login selector UI is enabled.',
        },
      },
      accessAgreementEnabled: {
        type: 'boolean',
        _meta: {
          description:
            'Indicates if the access agreement UI is both enabled and supported by the current license.',
        },
      },
      authProviderCount: {
        type: 'long',
        _meta: {
          description:
            'The number of configured auth providers (including disabled auth providers).',
        },
      },
      enabledAuthProviders: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'The types of enabled auth providers (such as `saml`, `basic`, `pki`, etc).',
          },
        },
      },
      fipsModeEnabled: {
        type: 'boolean',
        _meta: {
          description: 'Indicates if Kibana is being run in FIPS mode.',
        },
      },
      httpAuthSchemes: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'The set of enabled http auth schemes. Used for api-based usage, and when credentials are provided via reverse-proxy.',
          },
        },
      },
      sessionIdleTimeoutInMinutes: {
        type: 'long',
        _meta: {
          description:
            'The global session idle timeout expiration that is configured, in minutes (0 if disabled).',
        },
      },
      sessionLifespanInMinutes: {
        type: 'long',
        _meta: {
          description:
            'The global session lifespan expiration that is configured, in minutes (0 if disabled).',
        },
      },
      sessionCleanupInMinutes: {
        type: 'long',
        _meta: {
          description:
            'The session cleanup interval that is configured, in minutes (0 if disabled).',
        },
      },
      sessionConcurrentSessionsMaxSessions: {
        type: 'long',
        _meta: {
          description: 'The maximum number of the concurrent user sessions (0 if not configured).',
        },
      },
      anonymousCredentialType: {
        type: 'keyword',
        _meta: {
          description:
            'The credential type that is configured for the anonymous authentication provider.',
        },
      },
    },
    fetch: () => {
      const { allowRbac, allowAccessAgreement, allowAuditLogging, allowFips } =
        license.getFeatures();
      if (!allowRbac) {
        return {
          auditLoggingEnabled: false,
          loginSelectorEnabled: false,
          accessAgreementEnabled: false,
          authProviderCount: 0,
          enabledAuthProviders: [],
          fipsModeEnabled: false,
          httpAuthSchemes: [],
          sessionIdleTimeoutInMinutes: 0,
          sessionLifespanInMinutes: 0,
          sessionCleanupInMinutes: 0,
          sessionConcurrentSessionsMaxSessions: 0,
          anonymousCredentialType: undefined,
        };
      }

      const auditLoggingEnabled = allowAuditLogging && config.audit.enabled;
      const loginSelectorEnabled = config.authc.selector.enabled;
      const authProviderCount = config.authc.sortedProviders.length;
      const enabledAuthProviders = [
        ...new Set(config.authc.sortedProviders.map((provider) => provider.type)),
      ];
      const accessAgreementEnabled =
        allowAccessAgreement &&
        (!!config.accessAgreement?.message ||
          config.authc.sortedProviders.some((provider) => provider.hasAccessAgreement));

      const httpAuthSchemes = config.authc.http.schemes.filter((scheme) =>
        WELL_KNOWN_AUTH_SCHEMES.includes(scheme.toLowerCase())
      );

      const fipsModeEnabled = allowFips && config.fipsMode.enabled;

      const sessionExpirations = config.session.getExpirationTimeouts(undefined); // use `undefined` to get global expiration values
      const sessionIdleTimeoutInMinutes = sessionExpirations.idleTimeout?.asMinutes() ?? 0;
      const sessionLifespanInMinutes = sessionExpirations.lifespan?.asMinutes() ?? 0;
      const sessionCleanupInMinutes = config.session.cleanupInterval?.asMinutes() ?? 0;
      const sessionConcurrentSessionsMaxSessions =
        config.session.concurrentSessions?.maxSessions ?? 0;

      const anonProviders = config.authc.providers.anonymous ?? ({} as Record<string, any>);
      const foundProvider = Object.entries(anonProviders).find(
        ([_, provider]) => !!provider.credentials && provider.enabled
      );

      const credElasticAnonUser = 'elasticsearch_anonymous_user';
      const credApiKey = 'api_key';
      const credUsernamePassword = 'username_password';

      let anonymousCredentialType;
      if (foundProvider) {
        if (!!foundProvider[1].credentials.apiKey) anonymousCredentialType = credApiKey;
        else if (foundProvider[1].credentials === credElasticAnonUser)
          anonymousCredentialType = credElasticAnonUser;
        else if (!!foundProvider[1].credentials.username && !!foundProvider[1].credentials.password)
          anonymousCredentialType = credUsernamePassword;
      }

      return {
        auditLoggingEnabled,
        loginSelectorEnabled,
        accessAgreementEnabled,
        authProviderCount,
        enabledAuthProviders,
        fipsModeEnabled,
        httpAuthSchemes,
        sessionIdleTimeoutInMinutes,
        sessionLifespanInMinutes,
        sessionCleanupInMinutes,
        sessionConcurrentSessionsMaxSessions,
        anonymousCredentialType,
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(securityCollector);
}

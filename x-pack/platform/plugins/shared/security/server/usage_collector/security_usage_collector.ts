/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import { DEFAULT_COOKIE_NAME } from '../config';
import { getDetailedErrorMessage } from '../errors';
import type { ServiceAccountsServiceStart } from '../service_accounts';
import type { WorkloadBindingSummary } from '../service_accounts/bindings';

interface ServiceAccountsUsage {
  enabled: boolean;
  boundWorkloads?: WorkloadBindingSummary;
}

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
  sessionCookieSecure: boolean;
  sessionCookieSameSite: string | undefined;
  sessionCookieNameCustomized: boolean;
  anonymousCredentialType: string | undefined;
  serviceAccounts: ServiceAccountsUsage;
}

interface Deps {
  usageCollection?: UsageCollectionSetup;
  config: ConfigType;
  license: SecurityLicense;
  logger: Logger;
  /** `undefined` until the plugin starts, then `null` when service accounts are not offered. */
  getServiceAccounts: () => ServiceAccountsServiceStart | null | undefined;
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

const getServiceAccountsUsage = async (
  serviceAccounts: ServiceAccountsServiceStart | null | undefined,
  logger: Logger
): Promise<ServiceAccountsUsage> => {
  if (!serviceAccounts) {
    return { enabled: false };
  }

  try {
    return {
      enabled: true,
      boundWorkloads: await serviceAccounts.management.summarizeBoundWorkloads(),
    };
  } catch (error) {
    logger.debug(`Failed to summarize workload bindings: ${getDetailedErrorMessage(error)}`);
    return { enabled: true };
  }
};

export function registerSecurityUsageCollector({
  usageCollection,
  config,
  license,
  logger,
  getServiceAccounts,
}: Deps): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const securityCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'security',
    isReady: () => license.isLicenseAvailable() && getServiceAccounts() !== undefined,
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
      sessionCookieSecure: {
        type: 'boolean',
        _meta: {
          description:
            'Indicates if session cookies are set with the Secure attribute (configured explicitly, or enabled automatically because Kibana serves TLS).',
        },
      },
      sessionCookieSameSite: {
        type: 'keyword',
        _meta: {
          description:
            'The SameSite attribute configured for session cookies (`Strict`, `Lax` or `None`), or `not_configured` when the setting is not set.',
        },
      },
      sessionCookieNameCustomized: {
        type: 'boolean',
        _meta: {
          description: 'Indicates if the session cookie name differs from the default.',
        },
      },
      anonymousCredentialType: {
        type: 'keyword',
        _meta: {
          description:
            'The credential type that is configured for the anonymous authentication provider.',
        },
      },
      serviceAccounts: {
        enabled: {
          type: 'boolean',
          _meta: { description: 'Indicates if service accounts are available on this deployment.' },
        },
        boundWorkloads: {
          total: {
            type: 'long',
            _meta: { description: 'The number of workloads bound to a service account.' },
          },
          serviceAccounts: {
            type: 'long',
            _meta: { description: 'The number of service accounts with at least one workload.' },
          },
          byWorkload: {
            type: 'array',
            items: {
              pluginId: {
                type: 'keyword',
                _meta: { description: 'The ID of the plugin that owns the workload type.' },
              },
              workloadType: {
                type: 'keyword',
                _meta: { description: 'The workload type, unique within its plugin.' },
              },
              count: {
                type: 'long',
                _meta: { description: 'The number of bound workloads of this type.' },
              },
            },
          },
          byBinderType: {
            user: {
              type: 'long',
              _meta: { description: 'The number of workloads bound by a user.' },
            },
            api_key: {
              type: 'long',
              _meta: { description: 'The number of workloads bound with an API key.' },
            },
            service_account: {
              type: 'long',
              _meta: { description: 'The number of workloads bound by a service account.' },
            },
          },
        },
      },
    },
    fetch: async () => {
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
          sessionCookieSecure: false,
          sessionCookieSameSite: undefined,
          sessionCookieNameCustomized: false,
          anonymousCredentialType: undefined,
          serviceAccounts: { enabled: false },
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

      const sessionCookieSecure = config.secureCookies;
      const sessionCookieSameSite = config.sameSiteCookies ?? 'not_configured';
      const sessionCookieNameCustomized = config.cookieName !== DEFAULT_COOKIE_NAME;

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
        sessionCookieSecure,
        sessionCookieSameSite,
        sessionCookieNameCustomized,
        anonymousCredentialType,
        serviceAccounts: await getServiceAccountsUsage(getServiceAccounts(), logger),
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(securityCollector);
}

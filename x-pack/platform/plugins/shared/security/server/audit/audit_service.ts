/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { distinctUntilKeyChanged, map } from 'rxjs';

import type {
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  LoggerContextConfigInput,
  LoggingServiceSetup,
} from '@kbn/core/server';
import type { AuditEvent, AuditLogger, AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import { httpRequestEvent } from './audit_events';
import type { SecurityLicense, SecurityLicenseFeatures } from '../../common';
import type { ConfigType } from '../config';
import type { SecurityPluginSetup } from '../plugin';

export const ECS_VERSION = '1.6.0';
export const RECORD_USAGE_INTERVAL = 60 * 60 * 1000; // 1 hour

// OTel-only overrides injected into the appender config when the audit appender is of type 'otel'.
// These translations/suppressions/defaults bring the output into alignment with Serverless
// audit log field requirements without touching the upstream AuditEvent type or any non-OTel path.

export const AUDIT_OTEL_FIELD_RENAMES: Record<string, string | string[]> = {
  'kibana.space_id': 'kibana.space.id',
  'kibana.session_id': 'kibana.session.id',
  'kibana.lookup_realm': 'kibana.lookup.realm',
  'kibana.authentication_type': 'authentication.type',
  'client.ip': ['source.address', 'source.ip'],
  'trace.id': 'request.id',
  // OTel semconv: singular 'header' with per-key attributes (not plural 'headers' object)
  'http.request.headers.x-forwarded-for': 'http.request.header.x-forwarded-for',
};

// Both fields are excluded on Serverless; stripped from log record and resource attributes.
export const AUDIT_OTEL_FIELD_DROPS: string[] = ['service.version', 'host.name'];

// event.type is required on every audit log. Authentication events omit it; default to 'access'.
// SO/Space events already carry a specific type (e.g. 'creation', 'deletion') so are unaffected.
export const AUDIT_OTEL_FIELD_DEFAULTS: Record<string, string | string[]> = {
  'event.type': ['access'],
};

// OTel semantic conventions require HTTP method to be uppercase (e.g. 'GET' not 'get').
// Kibana's route method is lowercase; the upstream AuditEvent is left as-is so that
// non-OTel appenders (file, console) continue to receive the original casing.
export const AUDIT_OTEL_FIELD_UPPERCASE: string[] = ['http.request.method'];

const normalize = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

interface AuditServiceSetupParams {
  license: SecurityLicense;
  config: ConfigType['audit'];
  logging: Pick<LoggingServiceSetup, 'configure'>;
  http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;

  getCurrentUser(
    request: KibanaRequest
  ): ReturnType<SecurityPluginSetup['authc']['getCurrentUser']> | undefined;

  getSID(request: KibanaRequest): Promise<string | undefined>;

  getSpaceId(
    request: KibanaRequest
  ): ReturnType<SpacesPluginSetup['spacesService']['getSpaceId']> | undefined;

  recordAuditLoggingUsage(): void;
}

export class AuditService {
  private logger: Logger;
  private usageIntervalId?: NodeJS.Timeout;

  constructor(_logger: Logger) {
    this.logger = _logger.get('ecs');
  }

  setup({
    license,
    config,
    logging,
    http,
    getCurrentUser,
    getSID,
    getSpaceId,
    recordAuditLoggingUsage,
  }: AuditServiceSetupParams): AuditServiceSetup {
    // Configure logging during setup and when license changes
    logging.configure(
      license.features$.pipe(
        distinctUntilKeyChanged('allowAuditLogging'),
        createLoggingConfig(config)
      )
    );

    // Record feature usage at a regular interval if enabled and license allows
    const enabled = !!(config.enabled && config.appender);
    const includeSavedObjectNames = config.include_saved_object_names;

    if (enabled) {
      license.features$.subscribe((features) => {
        clearInterval(this.usageIntervalId!);
        if (features.allowAuditLogging) {
          recordAuditLoggingUsage();
          this.usageIntervalId = setInterval(recordAuditLoggingUsage, RECORD_USAGE_INTERVAL);
          if (this.usageIntervalId.unref) {
            this.usageIntervalId.unref();
          }
        }
      });
    }

    const log = (event: AuditEvent | undefined) => {
      if (!event) {
        return;
      }
      if (filterEvent(event, config.ignore_filters)) {
        const { message, ...eventMeta } = event;
        this.logger.info(message, eventMeta);
      }
    };

    const isLoggingEnabled = () => {
      return this.logger.isLevelEnabled('info');
    };

    const asScoped = (request: KibanaRequest): AuditLogger => ({
      log: async (event) => {
        if (!event || !isLoggingEnabled()) {
          return;
        }
        const spaceId = getSpaceId(request);
        const user = getCurrentUser(request);
        const sessionId = await getSID(request);
        const forwardedFor = getForwardedFor(request);

        log({
          ...event,
          user:
            (user && {
              id: user.profile_uid,
              name: user.username,
              roles: user.roles as string[],
            }) ||
            event.user,
          kibana: {
            space_id: spaceId,
            session_id: sessionId,
            ...event.kibana,
          },
          trace: { id: request.id },
          client: { ip: request.socket.remoteAddress },
          http: forwardedFor
            ? {
                ...event.http,
                request: {
                  ...event.http?.request,
                  headers: {
                    'x-forwarded-for': forwardedFor,
                  },
                },
              }
            : event.http,
        });
      },
      enabled,
      includeSavedObjectNames,
    });

    http.registerOnPostAuth((request, response, t) => {
      if (request.auth.isAuthenticated && isLoggingEnabled()) {
        asScoped(request).log(httpRequestEvent({ request }));
      }
      return t.next();
    });

    return {
      asScoped,
      withoutRequest: { log, enabled, includeSavedObjectNames },
    };
  }

  stop() {
    clearInterval(this.usageIntervalId!);
  }
}

export const createLoggingConfig = (config: ConfigType['audit']) =>
  map<Pick<SecurityLicenseFeatures, 'allowAuditLogging'>, LoggerContextConfigInput>((features) => {
    const baseAppender = config.appender ?? {
      type: 'console' as const,
      layout: {
        type: 'pattern' as const,
        highlight: true,
      },
    };
    // When the configured appender is OTel, inject audit-specific field transforms
    // (renames, drops, defaults) to satisfy Serverless audit log field requirements at
    // the output layer — without touching the upstream AuditEvent type.
    const appender =
      baseAppender.type === 'otel'
        ? {
            ...baseAppender,
            fieldRenames: { ...baseAppender.fieldRenames, ...AUDIT_OTEL_FIELD_RENAMES },
            fieldDrops: [...(baseAppender.fieldDrops ?? []), ...AUDIT_OTEL_FIELD_DROPS],
            fieldDefaults: { ...AUDIT_OTEL_FIELD_DEFAULTS, ...baseAppender.fieldDefaults },
            fieldUppercase: [...(baseAppender.fieldUppercase ?? []), ...AUDIT_OTEL_FIELD_UPPERCASE],
          }
        : baseAppender;

    return {
      appenders: { auditTrailAppender: appender },
      loggers: [
        {
          name: 'audit.ecs',
          level: config.enabled && config.appender && features.allowAuditLogging ? 'info' : 'off',
          appenders: ['auditTrailAppender'],
        },
      ],
    };
  });

/**
 * Evaluates the list of provided ignore rules, and filters out events only
 * if *all* rules match the event.
 *
 * For event fields that can contain an array of multiple values, every value
 * must be matched by an ignore rule for the event to be excluded.
 */
export function filterEvent(
  event: AuditEvent,
  ignoreFilters: ConfigType['audit']['ignore_filters']
) {
  if (ignoreFilters) {
    return !ignoreFilters.some(
      (rule) =>
        (!rule.actions || rule.actions.includes(event.event?.action!)) &&
        (!rule.categories ||
          normalize(event.event?.category)?.every((c) => rule.categories?.includes(c || ''))) &&
        (!rule.types ||
          normalize(event.event?.type)?.every((t) => rule.types?.includes(t || ''))) &&
        (!rule.outcomes || rule.outcomes.includes(event.event?.outcome!)) &&
        (!rule.spaces || rule.spaces.includes(event.kibana?.space_id!)) &&
        (!rule.users || !event.user?.name || rule.users.includes(event.user.name))
    );
  }
  return true;
}

/**
 * Extracts `X-Forwarded-For` header(s) from `KibanaRequest`.
 */
export function getForwardedFor(request: KibanaRequest) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor.join(', ');
  }

  return forwardedFor;
}

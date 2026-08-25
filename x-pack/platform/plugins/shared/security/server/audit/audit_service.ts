/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { distinctUntilKeyChanged, map, shareReplay } from 'rxjs';

import type {
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  LoggerContextConfigInput,
  LoggingServiceSetup,
  StatusServiceSetup,
} from '@kbn/core/server';
import type { AuditEvent, AuditLogger, AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import { httpRequestEvent } from './audit_events';
import type { AuditLogWriteAccess } from './audit_write_access';
import { getAuditLogPath, getAuditStatus$, probeAuditLogWriteAccess } from './audit_write_access';
import type { SecurityLicense, SecurityLicenseFeatures } from '../../common';
import type { ConfigType } from '../config';
import type { SecurityPluginSetup } from '../plugin';

export const ECS_VERSION = '1.6.0';
export const RECORD_USAGE_INTERVAL = 60 * 60 * 1000; // 1 hour

const normalize = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

interface AuditServiceSetupParams {
  license: SecurityLicense;
  config: ConfigType['audit'];
  logging: Pick<LoggingServiceSetup, 'configure'>;
  http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;
  // Used to report the plugin as degraded while the audit log cannot be written.
  status: Pick<StatusServiceSetup, 'set' | 'derivedStatus$'>;

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
    status,
    getCurrentUser,
    getSID,
    getSpaceId,
    recordAuditLoggingUsage,
  }: AuditServiceSetupParams): AuditServiceSetup {
    const auditLogPath = config.enabled ? getAuditLogPath(config.appender) : undefined;

    const probed$ = license.features$.pipe(
      distinctUntilKeyChanged('allowAuditLogging'),
      map((features) => ({
        features,
        writeAccess:
          auditLogPath && features.allowAuditLogging
            ? probeAuditLogWriteAccess(auditLogPath)
            : undefined,
      })),
      shareReplay(1)
    );

    const writeAccess$ = auditLogPath
      ? probed$.pipe(map(({ writeAccess }) => writeAccess))
      : undefined;

    // Report the plugin as degraded while the audit log cannot be written, so the lost audit
    // trail shows up in /api/status rather than having to be inferred.
    status.set(getAuditStatus$({ writeAccess$, derivedStatus$: status.derivedStatus$ }));

    // Configure logging during setup and when the license changes
    logging.configure(
      probed$.pipe(
        map(({ features, writeAccess }) => createLoggingConfig(config, writeAccess)(features))
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

export const createLoggingConfig =
  (config: ConfigType['audit'], writeAccess?: AuditLogWriteAccess) =>
  (features: Pick<SecurityLicenseFeatures, 'allowAuditLogging'>): LoggerContextConfigInput => {
    if (writeAccess && !writeAccess.granted) {
      // Audit events are dropped rather than redirected to stdout on purpose: they carry usernames,
      // IPs and session ids that the audit sink is held to different access and retention rules for,
      // and at one record per authenticated request they would flood the main log.
      return {
        appenders: {
          // Core rejects a logger referencing an appender that is not in the map, so the key has to
          // exist even though the logger is `off`. Console is the filler that writes nothing.
          auditTrailAppender: { type: 'console' as const, layout: { type: 'json' as const } },
        },
        loggers: [{ name: 'audit.ecs', level: 'off' as const, appenders: ['auditTrailAppender'] }],
      };
    }

    const appender = config.appender ?? {
      type: 'console' as const,
      layout: {
        type: 'pattern' as const,
        highlight: true,
      },
    };

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
  };

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

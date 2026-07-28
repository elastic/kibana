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
  'kibana.authentication_type': 'authentication.type',
  'client.ip': ['source.address', 'source.ip'],
  'trace.id': 'http.request.id',
  // X-Forwarded-For maps to network.forwarded_ip (ECS / log-delivery convention).
  'http.request.headers.x-forwarded-for': 'network.forwarded_ip',
};

// Per-record log attributes stripped from the OTLP output on Serverless. (Resource-level exclusions
// — host.name, project_name, detector/env fields — are handled by the includeResources allowlist,
// not here.)
// - service.version: also carried per-record, so includeResources drops the resource copy and this
//   list drops the per-record copy.
// - kibana.lookup_realm / authentication_provider / authentication_realm: fixed values on Serverless
//   (always cloud-saml-kibana), so they carry no signal.
// - url.* components: replaced by url.original (built via fieldAdditions), which the ingest pipeline
//   reparses.
// - log.logger / service.id / service.node.roles / service.state / service.type: belong in the
//   resource, not per-record attributes.
export const AUDIT_OTEL_FIELD_DROPS: string[] = [
  'kibana.lookup_realm',
  'kibana.authentication_provider',
  'kibana.authentication_realm',
  'url.domain',
  'url.path',
  'url.port',
  'url.query',
  'url.scheme',
  'log.logger',
  'service.id',
  'service.node.roles',
  'service.state',
  'service.type',
  'service.version',
];

// event.type is required on every audit log. Authentication events omit it; default to 'access'.
// SO/Space events already carry a specific type (e.g. 'creation', 'deletion') so are unaffected.
// log.type: 'audit' is required on all audit logs per the log-delivery convention.
export const AUDIT_OTEL_FIELD_DEFAULTS: Record<string, string | string[]> = {
  'event.type': ['access'],
  'log.type': 'audit',
};

// OTel semantic conventions require HTTP method to be uppercase (e.g. 'GET' not 'get').
// Kibana's route method is lowercase; the upstream AuditEvent is left as-is so that
// non-OTel appenders (file, console) continue to receive the original casing.
export const AUDIT_OTEL_FIELD_UPPERCASE: string[] = ['http.request.method'];

// url.original is required by the log-delivery convention; the ingest pipeline's url processor
// parses it back into components. Built OTel-only from the split url.* fields (which are then
// dropped) so the upstream AuditEvent — and non-OTel appenders — are unaffected. Port and query
// are intentionally omitted.
export const AUDIT_OTEL_FIELD_ADDITIONS: Record<string, string> = {
  'url.original': '{url.scheme}://{url.domain}{url.path}',
};

// Audit logs ship a deliberately minimal OTel resource. These two keys supply their values via the
// appender's `attributes` and survive its `includeResources` allowlist: service.name identifies the
// audit signal, service.type identifies the product. project.id also survives (see
// AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES); everything else the detectors produce (host/OS/process/
// env) is filtered out.
export const AUDIT_OTEL_RESOURCE_ATTRIBUTES: Record<string, string> = {
  'service.name': 'serverless-kibana',
  'service.type': 'kibana',
};

// project.id arrives as a resource attribute (buildOtelResources() promotes the
// `elastic.apm.globalLabels.project.id` APM global label to the OTel resource, and deployments may
// also set it via the appender's `attributes`). On Serverless each Kibana instance serves exactly
// one project, so this instance-wide id correctly identifies the project every audit record belongs
// to — which is why it is safe to copy onto each record. It is deliberately kept in BOTH places:
// the log-delivery pipeline reads project.id from the resource (removing it breaks delivery), so we
// keep it there (via includeResources below) and also promote a per-record copy. Absent when there
// is no such source (e.g. non-Cloud), in which case nothing is promoted.
export const AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES: string[] = ['project.id'];

const normalize = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

interface AuditServiceSetupParams {
  license: SecurityLicense;
  config: ConfigType['audit'];
  logging: Pick<LoggingServiceSetup, 'configure'>;
  http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;
  // The OTel audit field transforms target Serverless log-delivery requirements only. On other
  // build flavors the OTel appender is left untouched (full resource, raw ECS field names).
  // Defaults to `false` (no transforms) when omitted; the plugin always passes it explicitly.
  isServerless?: boolean;

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
    isServerless = false,
    getCurrentUser,
    getSID,
    getSpaceId,
    recordAuditLoggingUsage,
  }: AuditServiceSetupParams): AuditServiceSetup {
    // Configure logging during setup and when license changes
    logging.configure(
      license.features$.pipe(
        distinctUntilKeyChanged('allowAuditLogging'),
        createLoggingConfig(config, isServerless)
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

export const createLoggingConfig = (config: ConfigType['audit'], isServerless = false) =>
  map<Pick<SecurityLicenseFeatures, 'allowAuditLogging'>, LoggerContextConfigInput>((features) => {
    const baseAppender = config.appender ?? {
      type: 'console' as const,
      layout: {
        type: 'pattern' as const,
        highlight: true,
      },
    };
    // On Serverless, when the configured appender is OTel, inject audit-specific field transforms
    // (renames, drops, defaults, additions) to satisfy Serverless audit log field requirements at
    // the output layer — without touching the upstream AuditEvent type — and slim the resource to
    // the minimal audit attributes. These transforms are Serverless-only: on other build flavors
    // the OTel appender is left untouched (full resource, raw ECS field names).
    const appender =
      isServerless && baseAppender.type === 'otel'
        ? {
            ...baseAppender,
            fieldRenames: { ...baseAppender.fieldRenames, ...AUDIT_OTEL_FIELD_RENAMES },
            fieldDrops: [...(baseAppender.fieldDrops ?? []), ...AUDIT_OTEL_FIELD_DROPS],
            fieldDefaults: { ...AUDIT_OTEL_FIELD_DEFAULTS, ...baseAppender.fieldDefaults },
            fieldUppercase: [...(baseAppender.fieldUppercase ?? []), ...AUDIT_OTEL_FIELD_UPPERCASE],
            fieldAdditions: { ...baseAppender.fieldAdditions, ...AUDIT_OTEL_FIELD_ADDITIONS },
            // Slim the resource to the configured attributes — the appender's own `attributes` plus
            // the audit service.name/service.type — dropping the detectors' host/OS/process/env
            // fields. The allowlist also keeps the promoted keys (AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
            // e.g. project.id): they must survive in the resource because log delivery reads them
            // there, in addition to being copied into per-record attributes below.
            includeResources: [
              ...Object.keys({ ...baseAppender.attributes, ...AUDIT_OTEL_RESOURCE_ATTRIBUTES }),
              ...AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
            ],
            promoteResourceAttributes: [
              ...(baseAppender.promoteResourceAttributes ?? []),
              ...AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
            ],
            attributes: { ...baseAppender.attributes, ...AUDIT_OTEL_RESOURCE_ATTRIBUTES },
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

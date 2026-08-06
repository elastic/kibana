/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelAttributesTransform } from '@kbn/core/server';

// OTel-only attribute mapping applied via the OTel appender's programmatic `transformAttributes`
// hook when the audit appender is of type 'otel' on Serverless. It brings the output into
// alignment with Serverless audit log field requirements without touching the upstream
// AuditEvent type or any non-OTel path (file/console appenders keep the raw ECS fields).

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
// - url.* components: replaced by url.original (built via AUDIT_OTEL_FIELD_ADDITIONS), which the
//   ingest pipeline reparses.
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
// keep it there (via includeResources) and also promote a per-record copy. Absent when there is no
// such source (e.g. non-Cloud), in which case nothing is promoted.
export const AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES: string[] = ['project.id'];

/**
 * A field-addition template parsed once at module load so the transform doesn't re-parse the regex
 * on every record (audit logging is a hot path). `segments` are the literal/placeholder parts in
 * order; `refs` are the referenced attribute keys, for the presence/scalar check.
 */
interface CompiledFieldAddition {
  key: string;
  refs: string[];
  segments: Array<{ literal: string } | { ref: string }>;
}

/**
 * Parses each addition template into literal segments + placeholder refs. Splitting on the `{ref}`
 * capturing group yields alternating literals (even indices) and refs (odd indices).
 */
const compileFieldAdditions = (additions: Record<string, string>): CompiledFieldAddition[] =>
  Object.entries(additions).map(([key, template]) => {
    const tokens = template.split(/\{([^}]+)\}/);
    const segments = tokens.map((token, index) =>
      index % 2 === 0 ? { literal: token } : { ref: token }
    );
    const refs = tokens.filter((_, index) => index % 2 === 1);
    return { key, refs, segments };
  });

const compiledFieldAdditions = compileFieldAdditions(AUDIT_OTEL_FIELD_ADDITIONS);

/**
 * Maps the flattened per-record OTel attributes of an audit log record to the Serverless audit log
 * field requirements. Applied via the OTel appender's programmatic `transformAttributes` hook, after
 * the appender has flattened the log record (and promoted resource attributes) into OTel attributes.
 *
 * Pipeline order (significant): renames (incl. fan-out) → derived additions (url.original, which may
 * reference fields that are then dropped) → drops → defaults → uppercase. The input attributes are
 * not mutated.
 */
export const applyAuditOtelFieldMap: OtelAttributesTransform = (attributes) => {
  const attrs = { ...attributes };

  for (const [oldKey, newKeys] of Object.entries(AUDIT_OTEL_FIELD_RENAMES)) {
    if (oldKey in attrs) {
      const value = attrs[oldKey];
      delete attrs[oldKey];
      const targets = Array.isArray(newKeys) ? newKeys : [newKeys];
      for (const newKey of targets) {
        attrs[newKey] = value;
      }
    }
  }

  // Derived attributes run after renames (so templates can reference renamed keys) and before drops
  // (so a template may reference source fields that are then dropped, e.g. url.original from
  // url.scheme/domain/path).
  for (const { key, refs, segments } of compiledFieldAdditions) {
    // Templates may only reference scalar fields. Skip when any referenced field is missing,
    // nullish, empty, or an array/object — so events that don't carry the source fields (e.g.
    // non-http events for url.original) don't get a degenerate value, and array-valued attributes
    // (e.g. source.ip, event.type) aren't silently comma-joined into the template.
    const allUsable = refs.every((ref) => {
      const value = attrs[ref];
      return value != null && value !== '' && typeof value !== 'object';
    });
    if (!allUsable) {
      continue;
    }
    attrs[key] = segments
      .map((segment) => ('literal' in segment ? segment.literal : String(attrs[segment.ref])))
      .join('');
  }

  for (const key of AUDIT_OTEL_FIELD_DROPS) {
    delete attrs[key];
  }

  for (const [key, value] of Object.entries(AUDIT_OTEL_FIELD_DEFAULTS)) {
    if (!(key in attrs)) {
      attrs[key] = value;
    }
  }

  for (const key of AUDIT_OTEL_FIELD_UPPERCASE) {
    const value = attrs[key];
    if (typeof value === 'string') {
      attrs[key] = value.toUpperCase();
    }
  }

  return attrs;
};

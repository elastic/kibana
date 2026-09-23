/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelAttributesTransform } from '@kbn/core/server';

// Serverless audit logs ship a deliberately minimal OTel resource: these values survive the
// appender's includeResources allowlist; detector output (host/OS/process/env) is filtered out.
export const AUDIT_OTEL_RESOURCE_ATTRIBUTES: Record<string, string> = {
  'service.name': 'serverless-kibana',
  'service.type': 'kibana',
};

// project.id must stay in the resource (the log-delivery pipeline reads it there) AND per-record.
export const AUDIT_OTEL_PROMOTE_RESOURCE_ATTRIBUTES: string[] = ['project.id'];

/**
 * Maps the flattened per-record OTel attributes of an audit record to the Serverless audit log
 * field requirements, via the OTel appender's plugin `transformAttributes` hook.
 * Deliberately imperative: a closed, audit-owned translation that changes only when Serverless
 * field requirements do. Does not mutate the input.
 */
export const applyAuditOtelFieldMap: OtelAttributesTransform = (attributes) => {
  const attrs = { ...attributes };

  const move = (from: string, to: string): void => {
    if (from in attrs) {
      attrs[to] = attrs[from];
      delete attrs[from];
    }
  };

  move('kibana.space_id', 'kibana.space.id');
  move('kibana.session_id', 'kibana.session.id');
  move('kibana.authentication_type', 'authentication.type');
  move('trace.id', 'http.request.id');
  move('http.request.headers.x-forwarded-for', 'network.forwarded_ip');
  // user_login is the only event carrying the realm in the record; every other event gets
  // user.domain from the authenticated user at enrichment time (see AuditService.setup).
  move('kibana.authentication_realm', 'user.domain');
  if ('client.ip' in attrs) {
    attrs['source.address'] = attrs['client.ip'];
    attrs['source.ip'] = attrs['client.ip'];
    delete attrs['client.ip'];
  }

  // Serverless audit delivery keys users by login name, not by user profile UID: user.id becomes
  // the username and the profile UID is not emitted. user.id is deleted when there is no username
  // so a profile UID cannot leak through on events that carry an id but no name (user_logout).
  const userName = attrs['user.name'];
  if (typeof userName === 'string' && userName !== '') {
    attrs['user.id'] = userName;
  } else {
    delete attrs['user.id'];
  }

  // The ingest pipeline reparses url.original back into components. Skipped for non-http events
  // or non-scalar components (array values would silently comma-join).
  const scheme = attrs['url.scheme'];
  const domain = attrs['url.domain'];
  const path = attrs['url.path'];
  if (
    typeof scheme === 'string' &&
    typeof domain === 'string' &&
    typeof path === 'string' &&
    scheme !== '' &&
    domain !== '' &&
    path !== ''
  ) {
    attrs['url.original'] = `${scheme}://${domain}${path}`;
  }

  // Fixed-value fields (always cloud-saml-kibana on Serverless), url components superseded by
  // url.original, and service identity (belongs in the resource, not per-record).
  for (const key of [
    'kibana.lookup_realm',
    'kibana.authentication_provider',
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
  ]) {
    delete attrs[key];
  }

  // Auth events omit event.type; 'access' is the required default per the delivery convention.
  if (!('event.type' in attrs)) {
    attrs['event.type'] = ['access'];
  }
  if (!('log.type' in attrs)) {
    attrs['log.type'] = 'audit';
  }

  // OTel semconv requires uppercase; AuditEvent stays lowercase for non-OTel appenders.
  const method = attrs['http.request.method'];
  if (typeof method === 'string') {
    attrs['http.request.method'] = method.toUpperCase();
  }

  return attrs;
};

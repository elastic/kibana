/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes } from '@opentelemetry/api';

import { applyAuditOtelFieldMap } from './audit_otel_transform';

describe('applyAuditOtelFieldMap', () => {
  it('renames attributes to their target keys', () => {
    const result = applyAuditOtelFieldMap({
      'kibana.space_id': 'default',
      'kibana.session_id': 'SESSION_ID',
      'kibana.authentication_type': 'realm',
    });

    expect(result['kibana.space.id']).toBe('default');
    expect(result['kibana.session.id']).toBe('SESSION_ID');
    expect(result['authentication.type']).toBe('realm');
    expect(result).not.toHaveProperty('kibana.space_id');
    expect(result).not.toHaveProperty('kibana.session_id');
    expect(result).not.toHaveProperty('kibana.authentication_type');
  });

  it('fans out client.ip to source.address and source.ip and removes the original', () => {
    const result = applyAuditOtelFieldMap({ 'client.ip': '1.2.3.4' });

    expect(result['source.address']).toBe('1.2.3.4');
    expect(result['source.ip']).toBe('1.2.3.4');
    expect(result).not.toHaveProperty('client.ip');
  });

  it('renames trace.id to http.request.id and x-forwarded-for to network.forwarded_ip', () => {
    const result = applyAuditOtelFieldMap({
      'trace.id': 'REQUEST_ID',
      'http.request.headers.x-forwarded-for': '1.1.1.1, 2.2.2.2',
    });

    expect(result['http.request.id']).toBe('REQUEST_ID');
    expect(result['network.forwarded_ip']).toBe('1.1.1.1, 2.2.2.2');
    expect(result).not.toHaveProperty('trace.id');
    expect(result).not.toHaveProperty('http.request.headers.x-forwarded-for');
  });

  it('is a no-op for renames whose source key is absent', () => {
    const result = applyAuditOtelFieldMap({ 'event.action': 'user_login' });

    expect(result).not.toHaveProperty('kibana.space.id');
    expect(result).not.toHaveProperty('source.ip');
    expect(result['event.action']).toBe('user_login');
  });

  it('builds url.original from the split url.* fields and drops those components', () => {
    const result = applyAuditOtelFieldMap({
      'url.scheme': 'https',
      'url.domain': 'example.com',
      'url.path': '/api/status',
      'url.query': 'foo=bar',
      'url.port': 443,
    });

    expect(result['url.original']).toBe('https://example.com/api/status');
    expect(result).not.toHaveProperty('url.scheme');
    expect(result).not.toHaveProperty('url.domain');
    expect(result).not.toHaveProperty('url.path');
    expect(result).not.toHaveProperty('url.query');
    expect(result).not.toHaveProperty('url.port');
  });

  it('skips url.original when any referenced field is missing (non-http events)', () => {
    const result = applyAuditOtelFieldMap({ 'event.action': 'user_login' });

    expect(result).not.toHaveProperty('url.original');
  });

  it('skips url.original when a referenced field is array-valued (no silent comma-join)', () => {
    const result = applyAuditOtelFieldMap({
      'url.scheme': ['https'],
      'url.domain': 'example.com',
      'url.path': '/api/status',
    });

    expect(result).not.toHaveProperty('url.original');
  });

  it('drops the fixed-value and resource-bound attributes', () => {
    const result = applyAuditOtelFieldMap({
      'kibana.lookup_realm': 'cloud-saml-kibana',
      'kibana.authentication_provider': 'cloud-saml-kibana',
      'kibana.authentication_realm': 'cloud-saml-kibana',
      'log.logger': 'plugins.security.audit.ecs',
      'service.id': '5b2de169-2785-441b-ae8c-186a1936b17d',
      'service.node.roles': ['ui'],
      'service.state': 'green',
      'service.type': 'kibana',
      'service.version': '9.4.0',
    });

    for (const key of [
      'kibana.lookup_realm',
      'kibana.authentication_provider',
      'kibana.authentication_realm',
      'log.logger',
      'service.id',
      'service.node.roles',
      'service.state',
      'service.type',
      'service.version',
    ]) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it('defaults event.type to [access] and log.type to audit only when absent', () => {
    const withoutType = applyAuditOtelFieldMap({ 'event.action': 'user_login' });
    expect(withoutType['event.type']).toEqual(['access']);
    expect(withoutType['log.type']).toBe('audit');

    const withType = applyAuditOtelFieldMap({ 'event.type': ['creation'] });
    expect(withType['event.type']).toEqual(['creation']);
  });

  it('uppercases http.request.method', () => {
    const result = applyAuditOtelFieldMap({ 'http.request.method': 'get' });

    expect(result['http.request.method']).toBe('GET');
  });

  it('silently skips uppercase for non-string or absent values', () => {
    const absent = applyAuditOtelFieldMap({ 'event.action': 'user_login' });
    expect(absent).not.toHaveProperty('http.request.method');

    const nonString = applyAuditOtelFieldMap({ 'http.request.method': ['get'] });
    expect(nonString['http.request.method']).toEqual(['get']);
  });

  it('does not mutate the input attributes', () => {
    const input: Attributes = {
      'kibana.space_id': 'default',
      'client.ip': '1.2.3.4',
      'log.logger': 'plugins.security.audit.ecs',
    };
    applyAuditOtelFieldMap(input);

    expect(input).toEqual({
      'kibana.space_id': 'default',
      'client.ip': '1.2.3.4',
      'log.logger': 'plugins.security.audit.ecs',
    });
  });

  it('maps a full http_request-shaped record to the Serverless audit field set', () => {
    // Mirrors the flattened attributes the OTel appender produces for an http_request audit event.
    const result = applyAuditOtelFieldMap({
      'log.logger': 'plugins.security.audit.ecs',
      'event.action': 'http_request',
      'event.category': ['web'],
      'event.outcome': 'success',
      'http.request.method': 'get',
      'kibana.space_id': 'default',
      'kibana.session_id': 'SESSION_ID',
      'kibana.authentication_type': 'realm',
      'kibana.authentication_provider': 'cloud-saml-kibana',
      'kibana.authentication_realm': 'cloud-saml-kibana',
      'kibana.lookup_realm': 'cloud-saml-kibana',
      'client.ip': '3.3.3.3',
      'trace.id': 'REQUEST_ID',
      'url.scheme': 'http',
      'url.domain': 'localhost',
      'url.path': '/api/status',
      'url.port': 5601,
      'user.name': 'jdoe',
    });

    expect(result).toEqual({
      'event.action': 'http_request',
      'event.category': ['web'],
      'event.outcome': 'success',
      'event.type': ['access'],
      'log.type': 'audit',
      'http.request.method': 'GET',
      'http.request.id': 'REQUEST_ID',
      'kibana.space.id': 'default',
      'kibana.session.id': 'SESSION_ID',
      'authentication.type': 'realm',
      'source.address': '3.3.3.3',
      'source.ip': '3.3.3.3',
      'url.original': 'http://localhost/api/status',
      'user.name': 'jdoe',
    });
  });
});

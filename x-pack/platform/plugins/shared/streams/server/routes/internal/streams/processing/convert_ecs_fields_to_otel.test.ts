/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOtelFieldName, convertEcsFieldsToOtel } from './convert_ecs_fields_to_otel';

describe('getOtelFieldName', () => {
  it('returns @timestamp as-is', () => {
    expect(getOtelFieldName('@timestamp')).toBe('@timestamp');
  });

  it('maps message to body.text', () => {
    expect(getOtelFieldName('message')).toBe('body.text');
  });

  it('maps match fields with attributes prefix', () => {
    expect(getOtelFieldName('client.address')).toBe('attributes.client.address');
  });

  it('maps equivalent fields with attributes prefix', () => {
    expect(getOtelFieldName('error.message')).toBe('attributes.exception.message');
  });

  it('maps OTLP fields without attributes prefix', () => {
    expect(getOtelFieldName('span.id')).toBe('span_id');
  });

  it('maps unknown fields with attributes prefix', () => {
    expect(getOtelFieldName('custom.field.name')).toBe('attributes.custom.field.name');
  });

  it('maps resource fields directly with resource.attributes prefix', () => {
    expect(getOtelFieldName('agent.type')).toBe('resource.attributes.agent.type');
    expect(getOtelFieldName('cloud.availability_zone')).toBe(
      'resource.attributes.cloud.availability_zone'
    );
    expect(getOtelFieldName('host.name')).toBe('resource.attributes.host.name');
  });

  it('maps equivalent resource fields with resource.attributes prefix', () => {
    expect(getOtelFieldName('cloud.service.name')).toBe('resource.attributes.cloud.platform');
    expect(getOtelFieldName('container.image.hash.all')).toBe(
      'resource.attributes.container.image.repo_digests'
    );
  });

  it('handles resource fields not in MATCH_FIELDS or EQUIVALENT_FIELDS', () => {
    expect(getOtelFieldName('agent.build.original')).toBe(
      'resource.attributes.agent.build.original'
    );
  });
});

describe('convertEcsFieldsToOtel', () => {
  it('replaces match fields in Grok patterns', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:client.address}')).toBe(
      '%{SYNTAX:attributes.client.address}'
    );
  });

  it('replaces equivalent fields in Grok patterns', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:error.message}')).toBe(
      '%{SYNTAX:attributes.exception.message}'
    );
  });

  it('replaces OTLP fields in Grok patterns', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:span.id}')).toBe('%{SYNTAX:span_id}');
  });

  it('replaces unknown fields with attributes prefix and underscores', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:unknown.field}')).toBe(
      '%{SYNTAX:attributes.unknown.field}'
    );
  });

  it('leaves patterns without fields unchanged', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX}')).toBe('%{SYNTAX}');
  });

  it('handles complex patterns with type', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:client.address:TYPE}')).toBe(
      '%{SYNTAX:attributes.client.address:TYPE}'
    );
  });

  it('replaces resource fields in Grok patterns with resource.attributes prefix', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:agent.type}')).toBe(
      '%{SYNTAX:resource.attributes.agent.type}'
    );
    expect(convertEcsFieldsToOtel('%{SYNTAX:cloud.availability_zone}')).toBe(
      '%{SYNTAX:resource.attributes.cloud.availability_zone}'
    );
  });

  it('replaces equivalent resource fields in Grok patterns with resource.attributes prefix', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:cloud.service.name}')).toBe(
      '%{SYNTAX:resource.attributes.cloud.platform}'
    );
    expect(convertEcsFieldsToOtel('%{SYNTAX:container.image.hash.all}')).toBe(
      '%{SYNTAX:resource.attributes.container.image.repo_digests}'
    );
  });

  it('handles complex patterns with resource fields and type', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:agent.type:TYPE}')).toBe(
      '%{SYNTAX:resource.attributes.agent.type:TYPE}'
    );
    expect(convertEcsFieldsToOtel('%{SYNTAX:cloud.availability_zone:TYPE}')).toBe(
      '%{SYNTAX:resource.attributes.cloud.availability_zone:TYPE}'
    );
  });
});

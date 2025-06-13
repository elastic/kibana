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
    expect(getOtelFieldName('cloud.service.name')).toBe('attributes.cloud.platform');
  });

  it('maps OTLP fields without attributes prefix', () => {
    expect(getOtelFieldName('span.id')).toBe('span_id');
  });

  it('maps unknown fields with attributes prefix', () => {
    expect(getOtelFieldName('custom.field.name')).toBe('attributes.custom.field.name');
  });
});

describe('convertEcsFieldsToOtel', () => {
  it('replaces match fields in Grok patterns', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:client.address}')).toBe(
      '%{SYNTAX:attributes.client.address}'
    );
  });

  it('replaces equivalent fields in Grok patterns', () => {
    expect(convertEcsFieldsToOtel('%{SYNTAX:cloud.service.name}')).toBe(
      '%{SYNTAX:attributes.cloud.platform}'
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
});

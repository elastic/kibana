/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOtelFieldName } from './convert_ecs_fields_to_otel';

describe('getOtelFieldName', () => {
  it('returns @timestamp as-is', () => {
    expect(getOtelFieldName('@timestamp', undefined)).toBe('@timestamp');
  });

  it('maps message to body.text', () => {
    expect(getOtelFieldName('message', undefined)).toBe('body.text');
  });

  it('maps match fields with attributes prefix', () => {
    expect(getOtelFieldName('client.address', undefined)).toBe('attributes.client.address');
  });

  it('maps equivalent fields with attributes prefix', () => {
    expect(getOtelFieldName('error.message', undefined)).toBe('attributes.exception.message');
  });

  it('maps OTLP fields without attributes prefix', () => {
    expect(getOtelFieldName('span.id', undefined)).toBe('span_id');
  });

  it('maps unknown fields with attributes prefix', () => {
    expect(getOtelFieldName('custom.field.name', undefined)).toBe('attributes.custom.field.name');
  });

  it('maps resource fields directly with resource.attributes prefix', () => {
    expect(getOtelFieldName('agent.type', undefined)).toBe('resource.attributes.agent.type');
    expect(getOtelFieldName('cloud.availability_zone', undefined)).toBe(
      'resource.attributes.cloud.availability_zone'
    );
    expect(getOtelFieldName('host.name', undefined)).toBe('resource.attributes.host.name');
  });

  it('maps equivalent resource fields with resource.attributes prefix', () => {
    expect(getOtelFieldName('cloud.service.name', undefined)).toBe(
      'resource.attributes.cloud.platform'
    );
    expect(getOtelFieldName('container.image.hash.all', undefined)).toBe(
      'resource.attributes.container.image.repo_digests'
    );
  });

  it('handles resource fields not in MATCH_FIELDS or EQUIVALENT_FIELDS', () => {
    expect(getOtelFieldName('agent.build.original', undefined)).toBe(
      'resource.attributes.agent.build.original'
    );
  });

  it('uses fieldMetadata.otel equivalent mapping if present', () => {
    const fakeFieldMetadata = {
      otel: [
        { relation: 'equivalent', attribute: 'otel.equivalent.field' },
        { relation: 'other', attribute: 'should.not.use' },
      ],
      // minimal stub for FieldMetadata
      pick: () => undefined,
      toPlain: () => ({}),
      name: 'some.ecs.field',
    } as any;
    expect(getOtelFieldName('some.ecs.field', fakeFieldMetadata)).toBe(
      'attributes.otel.equivalent.field'
    );
  });
});

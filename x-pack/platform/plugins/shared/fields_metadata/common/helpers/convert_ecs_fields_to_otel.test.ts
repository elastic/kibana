/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '..';
import { getOtelFieldName } from './convert_ecs_fields_to_otel';

describe('getOtelFieldName', () => {
  it('returns @timestamp as-is', () => {
    expect(getOtelFieldName({ name: '@timestamp' })).toBe('@timestamp');
  });

  it('maps message to body.text', () => {
    expect(getOtelFieldName({ name: 'message' })).toBe('body.text');
  });

  it('maps match fields with attributes prefix', () => {
    expect(getOtelFieldName({ name: 'client.address' })).toBe('attributes.client.address');
  });

  it('maps OTLP fields without attributes prefix', () => {
    expect(
      getOtelFieldName({
        name: 'span.id',
        otel: [{ relation: 'otlp', otlp_field: 'span_id' }],
      } as FieldMetadataPlain)
    ).toBe('span_id');
  });

  it('maps unknown fields with attributes prefix', () => {
    expect(getOtelFieldName({ name: 'custom.field.name' })).toBe('attributes.custom.field.name');
  });

  it('maps resource fields directly with resource.attributes prefix', () => {
    expect(getOtelFieldName({ name: 'agent.type' })).toBe('resource.attributes.agent.type');
    expect(getOtelFieldName({ name: 'cloud.availability_zone' })).toBe(
      'resource.attributes.cloud.availability_zone'
    );
    expect(getOtelFieldName({ name: 'host.name' })).toBe('resource.attributes.host.name');
  });

  it('maps equivalent resource fields with resource.attributes prefix', () => {
    expect(
      getOtelFieldName({
        name: 'cloud.service.name',
        otel: [{ relation: 'equivalent', attribute: 'cloud.platform' }],
      } as FieldMetadataPlain)
    ).toBe('resource.attributes.cloud.platform');
  });

  it('handles resource fields not in MATCH_FIELDS or EQUIVALENT_FIELDS', () => {
    expect(getOtelFieldName({ name: 'agent.build.original' })).toBe(
      'resource.attributes.agent.build.original'
    );
  });

  it('uses fieldMetadata.otel equivalent mapping if present', () => {
    const fakeFieldMetadata = {
      otel: [
        { relation: 'equivalent', attribute: 'otel.equivalent.field' },
        { relation: 'other', attribute: 'should.not.use' },
      ],
      name: 'some.ecs.field',
    } as FieldMetadataPlain;
    expect(getOtelFieldName(fakeFieldMetadata)).toBe('attributes.otel.equivalent.field');
  });
});

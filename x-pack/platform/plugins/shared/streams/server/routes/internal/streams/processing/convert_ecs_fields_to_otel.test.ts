/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
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

  it('maps OTLP fields without attributes prefix', () => {
    expect(
      getOtelFieldName('span.id', {
        name: 'span.id',
        otel: [{ relation: 'otlp', otlp_field: 'span_id' }],
      } as FieldMetadataPlain)
    ).toBe('span_id');
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
    expect(
      getOtelFieldName('cloud.service.name', {
        name: 'cloud.service.name',
        otel: [{ relation: 'equivalent', attribute: 'cloud.platform' }],
      } as FieldMetadataPlain)
    ).toBe('resource.attributes.cloud.platform');
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
      name: 'some.ecs.field',
    } as FieldMetadataPlain;
    expect(getOtelFieldName('some.ecs.field', fakeFieldMetadata)).toBe(
      'attributes.otel.equivalent.field'
    );
  });
});

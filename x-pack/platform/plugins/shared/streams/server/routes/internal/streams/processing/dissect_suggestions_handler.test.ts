/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { OTEL_CONTENT_FIELD, ECS_CONTENT_FIELD } from '@kbn/streams-schema';
import { mapFields } from './dissect_suggestions_handler';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';

describe('mapFields', () => {
  const fieldMetadata = {
    'normal.field': {},
    'otel.field': { otel_equivalent: 'otel.mapped' },
  } as unknown as Record<string, FieldMetadataPlain>;

  const reviewResults = [
    {
      ecs_field: '@timestamp',
      columns: ['field_1'],
    },
    {
      ecs_field: 'normal.field',
      columns: ['field_2'],
    },
    {
      ecs_field: 'message',
      columns: ['field_3'],
    },
    {
      ecs_field: 'otel.field',
      columns: ['field_4'],
    },
    {
      ecs_field: 'no.otel.equiv',
      columns: ['field_5'],
    },
  ];

  describe('non-otel (useOtelFieldNames = false)', () => {
    it('maps @timestamp to custom.timestamp and preserves other ECS names', () => {
      const result = mapFields(reviewResults.slice(0, 2), fieldMetadata, false, ECS_CONTENT_FIELD);
      expect(result).toEqual([
        {
          ecs_field: 'custom.timestamp',
          columns: ['field_1'],
        },
        {
          ecs_field: 'normal.field',
          columns: ['field_2'],
        },
      ]);
    });

    it('replaces message catch-all with the actual field name', () => {
      const result = mapFields(
        [{ ecs_field: 'message', columns: ['field_3'] }],
        fieldMetadata,
        false,
        'error.message'
      );
      expect(result).toEqual([
        {
          ecs_field: 'error.message',
          columns: ['field_3'],
        },
      ]);
    });
  });

  describe('otel (useOtelFieldNames = true)', () => {
    it('maps fields to OTel equivalents with prefixing and replaces message with field name', () => {
      const result = mapFields(reviewResults, fieldMetadata, true, OTEL_CONTENT_FIELD);
      expect(result).toEqual([
        {
          ecs_field: prefixOTelField('custom.timestamp'),
          columns: ['field_1'],
        },
        {
          ecs_field: prefixOTelField('normal.field'),
          columns: ['field_2'],
        },
        {
          ecs_field: 'body.text',
          columns: ['field_3'],
        },
        {
          ecs_field: 'otel.mapped',
          columns: ['field_4'],
        },
        {
          ecs_field: prefixOTelField('no.otel.equiv'),
          columns: ['field_5'],
        },
      ]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
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
      ecs_field: 'otel.field',
      columns: ['field_3'],
    },
    {
      ecs_field: 'no.otel.equiv',
      columns: ['field_4'],
    },
  ];

  describe('non-otel (useOtelFieldNames = false)', () => {
    it('maps @timestamp to custom.timestamp and preserves other ECS names', () => {
      const result = mapFields(reviewResults.slice(0, 2), fieldMetadata, false);
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
  });

  describe('otel (useOtelFieldNames = true)', () => {
    it('maps fields to OTel equivalents with prefixing', () => {
      const result = mapFields(reviewResults, fieldMetadata, true);
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
          ecs_field: 'otel.mapped',
          columns: ['field_3'],
        },
        {
          ecs_field: prefixOTelField('no.otel.equiv'),
          columns: ['field_4'],
        },
      ]);
    });
  });
});

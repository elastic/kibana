/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { mapFields } from './grok_suggestions_handler';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';

describe('mapFields', () => {
  const fieldMetadata = {
    'normal.field': {},
    'otel.field': { otel_equivalent: 'otel.mapped' },
    // ...other fields as needed
  } as unknown as Record<string, FieldMetadataPlain>;

  const reviewResults = [
    {
      ecs_field: '@timestamp',
      columns: ['col1'],
      grok_components: ['comp1'],
    },
    {
      ecs_field: 'normal.field',
      columns: ['col2'],
      grok_components: ['comp2'],
    },
    {
      ecs_field: 'otel.field',
      columns: ['col3'],
      grok_components: ['comp3'],
    },
    {
      ecs_field: 'no.otel.equiv',
      columns: ['col4'],
      grok_components: ['comp4'],
    },
  ];

  describe('non-otel (useOtelFieldNames = false)', () => {
    it('maps @timestamp and normal fields as expected', () => {
      const result = mapFields(reviewResults.slice(0, 2), fieldMetadata, false);
      expect(result).toEqual([
        {
          name: 'custom.timestamp',
          columns: ['col1'],
          grok_components: ['comp1'],
        },
        {
          name: 'normal.field',
          columns: ['col2'],
          grok_components: ['comp2'],
        },
      ]);
    });
  });

  describe('otel (useOtelFieldNames = true)', () => {
    it('maps @timestamp, otel_equivalent, and calls prefixOTelField for missing otel_equivalent', () => {
      const result = mapFields(reviewResults, fieldMetadata, true);
      expect(result).toEqual([
        {
          name: prefixOTelField('custom.timestamp'),
          columns: ['col1'],
          grok_components: ['comp1'],
        },
        {
          name: prefixOTelField('normal.field'),
          columns: ['col2'],
          grok_components: ['comp2'],
        },
        {
          name: 'otel.mapped',
          columns: ['col3'],
          grok_components: ['comp3'],
        },
        {
          name: prefixOTelField('no.otel.equiv'),
          columns: ['col4'],
          grok_components: ['comp4'],
        },
      ]);
    });
  });
});

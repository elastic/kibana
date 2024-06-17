/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlatTyped } from '../../constants';
import { getUnallowedValueRequestItems, getValidValues, hasAllowedValues } from './helpers';

describe('helpers', () => {
  describe('hasAllowedValues', () => {
    test('it returns true for a field that has `allowed_values`', () => {
      expect(
        hasAllowedValues({
          ecsMetadata: EcsFlatTyped,
          fieldName: 'event.category',
        })
      ).toBe(true);
    });

    test('it returns false for a field that does NOT have `allowed_values`', () => {
      expect(
        hasAllowedValues({
          ecsMetadata: EcsFlatTyped,
          fieldName: 'host.name',
        })
      ).toBe(false);
    });

    test('it returns false for a field that does NOT exist in `ecsMetadata`', () => {
      expect(
        hasAllowedValues({
          ecsMetadata: EcsFlatTyped,
          fieldName: 'does.NOT.exist',
        })
      ).toBe(false);
    });
  });

  describe('getValidValues', () => {
    test('it returns the expected valid values', () => {
      expect(getValidValues(EcsFlatTyped['event.category'])).toEqual(
        expect.arrayContaining([
          'authentication',
          'configuration',
          'database',
          'driver',
          'email',
          'file',
          'host',
          'iam',
          'intrusion_detection',
          'malware',
          'network',
          'package',
          'process',
          'registry',
          'session',
          'threat',
          'vulnerability',
          'web',
        ])
      );
    });

    test('it returns an empty array when the `field` does NOT have `allowed_values`', () => {
      expect(getValidValues(EcsFlatTyped['host.name'])).toEqual([]);
    });

    test('it returns an empty array when `field` is undefined', () => {
      expect(getValidValues(undefined)).toEqual([]);
    });
  });

  describe('getUnallowedValueRequestItems', () => {
    test('it returns the expected request items', () => {
      expect(
        getUnallowedValueRequestItems({
          ecsMetadata: EcsFlatTyped,
          indexName: 'auditbeat-*',
        })
      ).toEqual([
        {
          indexName: 'auditbeat-*',
          indexFieldName: 'event.category',
          allowedValues: expect.arrayContaining([
            'authentication',
            'configuration',
            'database',
            'driver',
            'email',
            'file',
            'host',
            'iam',
            'intrusion_detection',
            'malware',
            'network',
            'package',
            'process',
            'registry',
            'session',
            'threat',
            'vulnerability',
            'web',
          ]),
        },
        {
          indexName: 'auditbeat-*',
          indexFieldName: 'event.kind',
          allowedValues: expect.arrayContaining([
            'alert',
            'enrichment',
            'event',
            'metric',
            'state',
            'pipeline_error',
            'signal',
          ]),
        },
        {
          indexName: 'auditbeat-*',
          indexFieldName: 'event.outcome',
          allowedValues: expect.arrayContaining(['failure', 'success', 'unknown']),
        },
        {
          indexName: 'auditbeat-*',
          indexFieldName: 'event.type',
          allowedValues: expect.arrayContaining([
            'access',
            'admin',
            'allowed',
            'change',
            'connection',
            'creation',
            'deletion',
            'denied',
            'end',
            'error',
            'group',
            'indicator',
            'info',
            'installation',
            'protocol',
            'start',
            'user',
          ]),
        },
      ]);
    });
  });
});

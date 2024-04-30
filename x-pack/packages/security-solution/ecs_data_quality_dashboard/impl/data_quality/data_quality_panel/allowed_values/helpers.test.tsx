/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import { omit } from 'lodash/fp';

import { getUnallowedValueRequestItems, getValidValues, hasAllowedValues } from './helpers';
import { AllowedValue, EcsMetadata } from '../../types';

const ecsMetadata: Record<string, EcsMetadata> = EcsFlat as unknown as Record<string, EcsMetadata>;

describe('helpers', () => {
  describe('hasAllowedValues', () => {
    test('it returns true for a field that has `allowed_values`', () => {
      expect(
        hasAllowedValues({
          ecsMetadata,
          fieldName: 'event.category',
        })
      ).toBe(true);
    });

    test('it returns false for a field that does NOT have `allowed_values`', () => {
      expect(
        hasAllowedValues({
          ecsMetadata,
          fieldName: 'host.name',
        })
      ).toBe(false);
    });

    test('it returns false for a field that does NOT exist in `ecsMetadata`', () => {
      expect(
        hasAllowedValues({
          ecsMetadata,
          fieldName: 'does.NOT.exist',
        })
      ).toBe(false);
    });

    test('it returns false when `ecsMetadata` is null', () => {
      expect(
        hasAllowedValues({
          ecsMetadata: null, // <--
          fieldName: 'event.category',
        })
      ).toBe(false);
    });
  });

  describe('getValidValues', () => {
    test('it returns the expected valid values', () => {
      expect(getValidValues(ecsMetadata['event.category'])).toEqual(
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
      expect(getValidValues(ecsMetadata['host.name'])).toEqual([]);
    });

    test('it returns an empty array when `field` is undefined', () => {
      expect(getValidValues(undefined)).toEqual([]);
    });

    test('it skips `allowed_values` where `name` is undefined', () => {
      // omit the `name` property from the `database` `AllowedValue`:
      const missingDatabase =
        ecsMetadata['event.category'].allowed_values?.map((x) =>
          x.name === 'database' ? omit<AllowedValue>('name', x) : x
        ) ?? [];

      const field = {
        ...ecsMetadata['event.category'],
        allowed_values: missingDatabase,
      };

      expect(getValidValues(field)).toEqual(
        expect.arrayContaining([
          'authentication',
          'configuration',
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
      expect(getValidValues(field)).not.toEqual(
        expect.arrayContaining([
          // there should be no entry for 'database'
          'database',
        ])
      );
    });
  });

  describe('getUnallowedValueRequestItems', () => {
    test('it returns the expected request items', () => {
      expect(
        getUnallowedValueRequestItems({
          ecsMetadata,
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

    test('it returns an empty array when `ecsMetadata` is null', () => {
      expect(
        getUnallowedValueRequestItems({
          ecsMetadata: null, // <--
          indexName: 'auditbeat-*',
        })
      ).toEqual([]);
    });
  });
});

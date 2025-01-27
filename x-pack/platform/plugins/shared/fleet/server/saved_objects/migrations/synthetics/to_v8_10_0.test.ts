/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import { getBrowserPolicy } from './fixtures/8.7.0';

import { migrateSyntheticsPackagePolicyToV8100 as migration } from './to_v8_10_0';

describe('8.10.0 Synthetics Package Policy migration', () => {
  describe('processors migration', () => {
    it('handles processors field for empty values', () => {
      const actual = migration(
        getBrowserPolicy('false'),
        {} as SavedObjectModelTransformationContext
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.vars?.processors?.value).toEqual(
        '[{"add_fields":{"fields":{"monitor.fleet_managed":true,"config_id":"420754e9-40f2-486c-bc2e-265bafd735c5"},"target":""}}]'
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.compiled_stream?.processors).toEqual(
        '[{"add_fields":{"fields":{"monitor.fleet_managed":true,"config_id":"420754e9-40f2-486c-bc2e-265bafd735c5"},"target":""}}]'
      );
    });

    it('handles processors field for project monitor', () => {
      const actual = migration(
        getBrowserPolicy('', 'test-project'),
        {} as SavedObjectModelTransformationContext
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.vars?.processors?.value).toEqual(
        JSON.stringify([
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
                config_id: '420754e9-40f2-486c-bc2e-265bafd735c5',
                'monitor.project.name': 'test-project',
                'monitor.project.id': 'test-project',
              },
              target: '',
            },
          },
        ])
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.compiled_stream.processors).toEqual(
        JSON.stringify([
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
                config_id: '420754e9-40f2-486c-bc2e-265bafd735c5',
                'monitor.project.name': 'test-project',
                'monitor.project.id': 'test-project',
              },
              target: '',
            },
          },
        ])
      );
    });

    it('handles processors field for test now fields', () => {
      const actual = migration(
        getBrowserPolicy('', 'test-project', 'test-run-id', true),
        {} as SavedObjectModelTransformationContext
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.vars?.processors?.value).toEqual(
        JSON.stringify([
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
                test_run_id: 'test-run-id',
                run_once: true,
                config_id: '420754e9-40f2-486c-bc2e-265bafd735c5',
                'monitor.project.name': 'test-project',
                'monitor.project.id': 'test-project',
              },
              target: '',
            },
          },
        ])
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.compiled_stream.processors).toEqual(
        JSON.stringify([
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
                test_run_id: 'test-run-id',
                run_once: true,
                config_id: '420754e9-40f2-486c-bc2e-265bafd735c5',
                'monitor.project.name': 'test-project',
                'monitor.project.id': 'test-project',
              },
              target: '',
            },
          },
        ])
      );
    });
  });
});

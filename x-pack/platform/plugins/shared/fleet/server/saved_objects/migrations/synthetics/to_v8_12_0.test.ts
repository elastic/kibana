/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

import { getBrowserPolicy } from './fixtures/8.7.0';

import { migrateSyntheticsPackagePolicyToV8120 as migration } from './to_v8_12_0';
import { migrateSyntheticsPackagePolicyToV8100 as migration10 } from './to_v8_10_0';

describe('8.12.0 Synthetics Package Policy migration', () => {
  describe('processors migration', () => {
    it('handles processors field for empty values', () => {
      const doc = getBrowserPolicy('false');
      const actual10 = migration10(doc, {} as SavedObjectModelTransformationContext);
      doc.attributes = actual10.attributes as PackagePolicy;

      const actual = migration(
        { ...doc, namespace: 'default' },
        {} as SavedObjectModelTransformationContext
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.vars?.processors?.value).toEqual(
        JSON.stringify([
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
                config_id: '420754e9-40f2-486c-bc2e-265bafd735c5',
                meta: { space_id: 'default' },
              },
              target: '',
            },
          },
        ])
      );
      expect(actual.attributes?.inputs?.[3]?.streams[0]?.compiled_stream?.processors).toEqual(
        JSON.stringify([
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
                config_id: '420754e9-40f2-486c-bc2e-265bafd735c5',
                meta: { space_id: 'default' },
              },
              target: '',
            },
          },
        ])
      );
    });

    it('handles processors field for project monitor', () => {
      const doc = getBrowserPolicy('', 'test-project');
      const actual10 = migration10(doc, {} as SavedObjectModelTransformationContext);
      doc.attributes = actual10.attributes as PackagePolicy;
      const actual = migration(
        { ...doc, namespace: 'default' },
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
                meta: { space_id: 'default' },
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
                meta: { space_id: 'default' },
              },
              target: '',
            },
          },
        ])
      );
    });

    it('handles processors field for test now fields', () => {
      const doc = getBrowserPolicy('', 'test-project', 'test-run-id', true);
      const actual10 = migration10(doc, {} as SavedObjectModelTransformationContext);
      doc.attributes = actual10.attributes as PackagePolicy;
      const actual = migration(
        { ...doc, namespace: 'test' },
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
                meta: { space_id: 'test' },
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
                meta: { space_id: 'test' },
              },
              target: '',
            },
          },
        ])
      );
    });
  });
});

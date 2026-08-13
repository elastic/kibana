/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { ModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';

import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { PackagePolicy } from '../../../common';

import { getSavedObjectTypes } from '..';

describe('package-policy model-version: bump Profiling Symbolizer policy', () => {
  describe.each`
    title               | soType                                     | targetModelVersion
    ${'original SO'}    | ${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE} | ${25}
    ${'space aware SO'} | ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}        | ${11}
  `(
    'for $title ($soType)',
    ({ soType, targetModelVersion }: { soType: string; targetModelVersion: number }) => {
      let migrator: ModelVersionTestMigrator;

      beforeEach(() => {
        migrator = createModelVersionTestMigrator({
          type: getSavedObjectTypes()[soType],
        });
      });

      it('marks Profiling Symbolizer policies for an agent policy revision bump', () => {
        const packagePolicy = createPackagePolicy(soType, 'profiler_symbolizer');

        const migratedPackagePolicy = migrator.migrate<PackagePolicy, PackagePolicy>({
          document: packagePolicy,
          fromVersion: targetModelVersion - 1,
          toVersion: targetModelVersion,
        });

        expect(migratedPackagePolicy.attributes).toEqual({
          ...packagePolicy.attributes,
          bump_agent_policy_revision: true,
        });
      });

      it.each(['profiler_collector', 'system'])(
        'leaves %s package policies unchanged',
        (packageName) => {
          const packagePolicy = createPackagePolicy(soType, packageName);

          const migratedPackagePolicy = migrator.migrate<PackagePolicy, PackagePolicy>({
            document: packagePolicy,
            fromVersion: targetModelVersion - 1,
            toVersion: targetModelVersion,
          });

          expect(migratedPackagePolicy.attributes).toEqual(packagePolicy.attributes);
        }
      );
    }
  );
});

function createPackagePolicy(soType: string, packageName: string): SavedObject<PackagePolicy> {
  return {
    id: `${packageName}-policy`,
    type: soType,
    references: [],
    attributes: {
      id: `${packageName}-policy`,
      name: `${packageName} policy`,
      namespace: 'default',
      enabled: true,
      policy_id: 'agent-policy',
      policy_ids: ['agent-policy'],
      package: {
        name: packageName,
        title: packageName,
        version: '1.0.0',
      },
      inputs: [],
      revision: 1,
      created_at: '2026-07-30T00:00:00.000Z',
      created_by: 'system',
      updated_at: '2026-07-30T00:00:00.000Z',
      updated_by: 'system',
    },
  };
}

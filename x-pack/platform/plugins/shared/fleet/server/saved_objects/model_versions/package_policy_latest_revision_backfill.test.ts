/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectModelTransformationContext,
} from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../common';

import { backfillPackagePolicyLatestRevision } from './package_policy_latest_revision_backfill';

describe('backfillPackagePolicyLatestRevision', () => {
  const packagePolicyDoc: SavedObject<PackagePolicy & { latest_revision?: boolean }> = {
    id: 'policy1',
    type: 'ingest-package-policies',
    references: [],
    attributes: {
      id: 'policy1',
      name: 'Policy 1',
      namespace: 'default',
      description: '',
      policy_id: 'policy1',
      policy_ids: ['policy1'],
      package: { name: 'test-package', version: '1.0.0', title: 'Test Package' },
      inputs: [],
      revision: 1,
      updated_at: '2021-08-17T14:00:00.000Z',
      updated_by: 'elastic',
      created_at: '2021-08-17T14:00:00.000Z',
      created_by: 'elastic',
      enabled: true,
    },
  };

  it('should set latest_revision to true if not defined', () => {
    const migratedPackagePolicyDoc = backfillPackagePolicyLatestRevision(
      packagePolicyDoc,
      {} as SavedObjectModelTransformationContext
    );

    expect(migratedPackagePolicyDoc.attributes.latest_revision).toBe(true);
  });

  it('should not change latest_revision if already defined', () => {
    const migratedPackagePolicyDoc = backfillPackagePolicyLatestRevision(
      {
        ...packagePolicyDoc,
        attributes: {
          ...packagePolicyDoc.attributes,
          latest_revision: false,
        },
      },
      {} as SavedObjectModelTransformationContext
    );

    expect(migratedPackagePolicyDoc.attributes.latest_revision).toBe(false);
  });
});

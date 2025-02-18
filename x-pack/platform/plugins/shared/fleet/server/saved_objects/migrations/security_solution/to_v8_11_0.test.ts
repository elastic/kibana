/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV8110 as migration } from './to_v8_11_0';
import { migratePackagePolicyEvictionsFromV8110 as eviction } from './to_v8_11_0';

describe('8.10.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({ manifestVersion }: { manifestVersion: string | undefined }) => {
    return {
      id: 'mock-saved-object-id',
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'endpoint',
          title: '',
          version: '',
        },
        id: 'endpoint',
        policy_id: '',
        policy_ids: [''],
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              policy: {
                value: {
                  global_manifest_version: manifestVersion,
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    };
  };

  it('adds manifest version field to policy, set to latest', () => {
    const initialDoc = policyDoc({ manifestVersion: undefined });

    const migratedDoc = policyDoc({ manifestVersion: 'latest' });

    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: {
        inputs: migratedDoc.attributes.inputs,
      },
    });
  });

  it('removes manifest version field from policy', () => {
    const initialDoc = policyDoc({ manifestVersion: 'latest' });

    const migratedDoc = policyDoc({ manifestVersion: undefined });

    expect(eviction(initialDoc.attributes)).toEqual(migratedDoc.attributes);
  });

  it('does not modify non-endpoint package policies', () => {
    const doc: SavedObjectUnsanitizedDoc<PackagePolicy> = {
      id: 'mock-saved-object-id',
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'notEndpoint',
          title: '',
          version: '',
        },
        id: 'notEndpoint',
        policy_id: '',
        policy_ids: [''],
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'notEndpoint',
            enabled: true,
            streams: [],
            config: {},
          },
        ],
      },
      type: ' nested',
    };

    expect(
      migration(
        doc,
        {} as SavedObjectModelTransformationContext
      ) as SavedObjectUnsanitizedDoc<PackagePolicy>
    ).toEqual({
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'notEndpoint',
          title: '',
          version: '',
        },
        id: 'notEndpoint',
        policy_id: '',
        policy_ids: [''],
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'notEndpoint',
            enabled: true,
            streams: [],
            config: {},
          },
        ],
      },
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV81102 as migration } from './to_v8_11_0_2';
import { migratePackagePolicyEvictionsFromV81102 as eviction } from './to_v8_11_0_2';

describe('8.11.0-2 Endpoint Package Policy migration', () => {
  const policyDoc = ({ meta = {} }) => {
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
                  meta: {
                    license: '',
                    cloud: false,
                    cluster_uuid: 'qwe',
                    cluster_name: 'clusterName',
                    ...meta,
                  },
                  windows: {},
                  mac: {},
                  linux: {},
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    };
  };

  it('adds a new field `license_uuid` that takes the value of `license_uid` if it exists', () => {
    const initialDoc = policyDoc({ meta: { license_uid: 'existing_uuid' } });

    const migratedDoc = policyDoc({
      meta: { license_uid: 'existing_uuid', license_uuid: 'existing_uuid' },
    });

    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: {
        inputs: migratedDoc.attributes.inputs,
      },
    });
  });

  it('adds a new field `license_uuid` that takes an empty value if `existing_uid` does not exist', () => {
    const initialDoc = policyDoc({});

    const migratedDoc = policyDoc({
      meta: { license_uuid: '' },
    });

    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: {
        inputs: migratedDoc.attributes.inputs,
      },
    });
  });

  it('removes `license_uuid` for backwards compatibility', () => {
    const initialDoc = policyDoc({
      meta: { license_uuid: 'existing_uuid' },
    });

    const migratedDoc = policyDoc({});

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

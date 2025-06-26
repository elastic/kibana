/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV840 as migration } from './to_v8_4_0';

describe('8.4.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({ linuxAdvanced = {}, windowsOptions = {} }) => {
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
                  windows: {
                    ...windowsOptions,
                  },
                  mac: {},
                  linux: {
                    ...linuxAdvanced,
                  },
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    };
  };

  it('adds advanced file monitoring defaulted to false and ensures credential hardening is added and false.', () => {
    const initialDoc = policyDoc({});

    const migratedDoc = policyDoc({
      linuxAdvanced: { advanced: { fanotify: { ignore_unknown_filesystems: false } } },
      windowsOptions: { attack_surface_reduction: { credential_hardening: { enabled: false } } },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('adds advanced file monitoring defaulted to false and preserves existing advanced fields and ensures credential hardening is added and false.', () => {
    const initialDoc = policyDoc({
      linuxAdvanced: { advanced: { existingAdvanced: true } },
    });

    const migratedDoc = policyDoc({
      linuxAdvanced: {
        advanced: { fanotify: { ignore_unknown_filesystems: false }, existingAdvanced: true },
      },
      windowsOptions: { attack_surface_reduction: { credential_hardening: { enabled: false } } },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
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
      migration(doc, {} as SavedObjectMigrationContext) as SavedObjectUnsanitizedDoc<PackagePolicy>
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
      type: ' nested',
      id: 'mock-saved-object-id',
    });
  });
});

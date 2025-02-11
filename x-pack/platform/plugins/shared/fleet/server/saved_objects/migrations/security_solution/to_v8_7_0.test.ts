/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV870 as migration } from './to_v8_7_0';

describe('8.7.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({ windowsEvents = {} }) => {
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
                    ...windowsEvents,
                  },
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

  it('adds credential access to windows events, defaulted to false', () => {
    const initialDoc = policyDoc({
      windowsEvents: { events: { process: true, file: true, network: true } },
    });

    const migratedDoc = policyDoc({
      windowsEvents: {
        events: { process: true, file: true, network: true, credential_access: false },
      },
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

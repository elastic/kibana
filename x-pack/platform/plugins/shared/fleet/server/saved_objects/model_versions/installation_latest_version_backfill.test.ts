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

import type { Installation } from '../../../common';

import { backfillInstallationLatestVersion } from './installation_latest_version_backfill';

describe('backfillInstallationLatestVersion', () => {
  const doc: SavedObject<Installation> = {
    id: 'my-package',
    type: 'epm-packages',
    references: [],
    attributes: {
      installed_kibana: [],
      installed_es: [],
      name: 'my-package',
      version: '1.0.0',
      install_status: 'installed',
      install_version: '1.0.0',
      install_started_at: '2023-10-01T00:00:00.000Z',
      install_source: 'registry',
      es_index_patterns: {},
      verification_status: 'verified',
    },
  };

  it('should set latest_revision to true if not defined', () => {
    const migratedDoc = backfillInstallationLatestVersion(
      doc,
      {} as SavedObjectModelTransformationContext
    );

    expect(migratedDoc.attributes.latest_version).toBe(true);
  });

  it('should not change latest_revision if already defined', () => {
    const migratedDoc = backfillInstallationLatestVersion(
      {
        ...doc,
        attributes: {
          ...doc.attributes,
          latest_version: false,
        },
      },
      {} as SavedObjectModelTransformationContext
    );

    expect(migratedDoc.attributes.latest_version).toBe(false);
  });
});

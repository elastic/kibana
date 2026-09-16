/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '@kbn/features-plugin/public';

import { createKibanaPrivileges } from './__fixtures__';

const versionedFeature = new KibanaFeature({
  id: 'versioned_feature',
  name: 'Versioned Feature',
  app: [],
  category: { id: 'foo', label: 'foo' },
  privileges: {
    all: {
      savedObject: { all: ['one'], read: [] },
      ui: [],
      privilegeVersions: [
        {
          version: 'v2',
          extractedInto: [{ feature: 'versioned_feature', privileges: ['so_two_all'] }],
        },
      ],
    },
    read: {
      savedObject: { all: [], read: ['one'] },
      ui: [],
    },
  },
  subFeatures: [
    {
      name: 'Access to `two`',
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'so_two_all',
              name: 'Can manage `two`',
              includeIn: 'all',
              savedObject: { all: ['two'], read: [] },
              ui: [],
            },
          ],
        },
      ],
    },
  ],
});

describe('SecuredFeature with privilegeVersions', () => {
  it('exposes every minted minimal privilege id, not just the current one', () => {
    const kibanaPrivileges = createKibanaPrivileges([versionedFeature]);
    const feature = kibanaPrivileges.getSecuredFeature('versioned_feature');

    const minimalIds = feature.getMinimalFeaturePrivileges().map((p) => p.id);
    expect(minimalIds).toEqual(
      expect.arrayContaining(['minimal_all', 'minimal_all_v2', 'minimal_read'])
    );
  });

  it('resolves the CURRENT minimal id for both legacy and current PrimaryFeaturePrivilege instances', () => {
    const kibanaPrivileges = createKibanaPrivileges([versionedFeature]);
    const feature = kibanaPrivileges.getSecuredFeature('versioned_feature');

    const minimalAll = feature.getMinimalFeaturePrivileges().find((p) => p.id === 'minimal_all')!;
    const minimalAllV2 = feature
      .getMinimalFeaturePrivileges()
      .find((p) => p.id === 'minimal_all_v2')!;

    expect(minimalAll.getMinimalPrivilegeId()).toBe('minimal_all_v2');
    expect(minimalAllV2.getMinimalPrivilegeId()).toBe('minimal_all_v2');
  });

  it('resolves a role holding the legacy (frozen) minimal id to the correct, fully composed actions', () => {
    const kibanaPrivileges = createKibanaPrivileges([versionedFeature]);

    // A role stored before the `two` extraction ever happened — still holds the literal,
    // now-frozen `minimal_all` name.
    const legacyCollection = kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      { base: [], feature: { versioned_feature: ['minimal_all'] }, spaces: ['*'] },
    ]);

    const soTwoAll = kibanaPrivileges
      .getSecuredFeature('versioned_feature')
      .getSubFeaturePrivileges()
      .find((p) => p.id === 'so_two_all')!;

    // Even though the role never explicitly requested `so_two_all`, the frozen `minimal_all` it
    // holds was registered with that grant composed in, so it must still resolve as granted.
    expect(legacyCollection.grantsPrivilege(soTwoAll)).toBe(true);

    // A role saved AFTER the extraction, holding only the new current id with nothing
    // additional, must NOT be granted `so_two_all`.
    const currentCollection = kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      { base: [], feature: { versioned_feature: ['minimal_all_v2'] }, spaces: ['*'] },
    ]);
    expect(currentCollection.grantsPrivilege(soTwoAll)).toBe(false);
  });
});

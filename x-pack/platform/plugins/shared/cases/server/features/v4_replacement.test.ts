/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FeatureKibanaPrivilegesReference,
  KibanaFeatureConfig,
} from '@kbn/features-plugin/common';
import { getV1 } from './v1';
import { getV2 } from './v2';
import { getV3 } from './v3';
import { getV4 } from './v4';
import { withCasesV4Replacement } from './v4_replacement';

const collectReferences = (feature: KibanaFeatureConfig): FeatureKibanaPrivilegesReference[] => {
  const privileges = [
    feature.privileges?.all,
    feature.privileges?.read,
    ...(feature.subFeatures ?? []).flatMap(({ privilegeGroups }) =>
      privilegeGroups.flatMap(({ privileges: groupPrivileges }) => groupPrivileges)
    ),
  ];
  return privileges.flatMap((privilege) => {
    const replacedBy = privilege?.replacedBy;
    if (!replacedBy) {
      return [];
    }
    return 'default' in replacedBy ? [...replacedBy.default, ...replacedBy.minimal] : replacedBy;
  });
};

const v4PrivilegeIds = (() => {
  const v4 = getV4();
  return new Set([
    'all',
    'read',
    'minimal_all',
    'minimal_read',
    ...(v4.subFeatures ?? []).flatMap(({ privilegeGroups }) =>
      privilegeGroups.flatMap(({ privileges }) => privileges.map(({ id }) => id))
    ),
  ]);
})();

describe('withCasesV4Replacement', () => {
  it('returns features that are not legacy Cases features unchanged', () => {
    const feature = { ...getV3(), id: 'discover_v2' };
    expect(withCasesV4Replacement(feature)).toBe(feature);
  });

  it.each([
    ['generalCases', getV1],
    ['generalCasesV2', getV2],
    ['generalCasesV3', getV3],
  ])('deprecates %s with every reference pointing at an existing casesV4 privilege', (id, get) => {
    const feature = withCasesV4Replacement(get());

    expect(feature.id).toBe(id);
    expect(feature.deprecated?.notice).toContain('casesV4');

    const references = collectReferences(feature);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference.feature).toBe('casesV4');
      for (const privilege of reference.privileges) {
        expect(v4PrivilegeIds).toContain(privilege);
      }
    }
  });

  it('gives every V3 privilege and sub-feature privilege a replacedBy', () => {
    const feature = withCasesV4Replacement(getV3());

    expect(feature.privileges?.all.replacedBy).toEqual({
      default: [{ feature: 'casesV4', privileges: ['all'] }],
      minimal: [{ feature: 'casesV4', privileges: ['minimal_all'] }],
    });
    expect(feature.privileges?.read.replacedBy).toEqual({
      default: [{ feature: 'casesV4', privileges: ['read'] }],
      minimal: [{ feature: 'casesV4', privileges: ['minimal_read'] }],
    });
    for (const { privilegeGroups } of feature.subFeatures ?? []) {
      for (const { privileges } of privilegeGroups) {
        for (const privilege of privileges) {
          expect(privilege.replacedBy).toEqual([
            { feature: 'casesV4', privileges: [privilege.id] },
          ]);
        }
      }
    }
  });

  it('keeps the V2 minimal_all extras when moving the reference to casesV4', () => {
    const feature = withCasesV4Replacement(getV2());

    expect(feature.privileges?.all.replacedBy).toEqual({
      default: [{ feature: 'casesV4', privileges: ['all'] }],
      minimal: [
        {
          feature: 'casesV4',
          privileges: ['minimal_all', 'cases_assign', 'cases_manage_templates'],
        },
      ],
    });
  });
});

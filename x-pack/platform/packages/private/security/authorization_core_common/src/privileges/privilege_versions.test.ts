/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAllMinimalPrivilegeIds,
  getCurrentMinimalPrivilegeId,
  getReferencesExtractedAfter,
  isAnyMinimalPrivilegeId,
} from '../..';

const grant1 = [{ feature: 'my_feature', privileges: ['grant_1'] }];
const grant2 = [{ feature: 'my_feature', privileges: ['grant_2'] }];

describe('Minimal privilege versions', () => {
  describe('with no version history', () => {
    it('#getAllMinimalPrivilegeIds returns just the bare id', () => {
      expect(getAllMinimalPrivilegeIds('all')).toEqual(['minimal_all']);
      expect(getAllMinimalPrivilegeIds('read', [])).toEqual(['minimal_read']);
    });

    it('#getCurrentMinimalPrivilegeId returns the bare id', () => {
      expect(getCurrentMinimalPrivilegeId('all')).toBe('minimal_all');
    });

    it('#isAnyMinimalPrivilegeId only recognizes the bare id', () => {
      expect(isAnyMinimalPrivilegeId('minimal_all', 'all')).toBe(true);
      expect(isAnyMinimalPrivilegeId('minimal_all_v2', 'all')).toBe(false);
    });

    it('#getReferencesExtractedAfter returns nothing for the bare id', () => {
      expect(getReferencesExtractedAfter('minimal_all', 'all')).toEqual([]);
    });
  });

  describe('with one version entry', () => {
    const privilegeVersions = [{ version: 'v2', extractedInto: grant1 }];

    it('#getAllMinimalPrivilegeIds returns the bare id and the new current id', () => {
      expect(getAllMinimalPrivilegeIds('all', privilegeVersions)).toEqual([
        'minimal_all',
        'minimal_all_v2',
      ]);
    });

    it('#getCurrentMinimalPrivilegeId returns the versioned id', () => {
      expect(getCurrentMinimalPrivilegeId('all', privilegeVersions)).toBe('minimal_all_v2');
    });

    it('#isAnyMinimalPrivilegeId recognizes both the bare and versioned id', () => {
      expect(isAnyMinimalPrivilegeId('minimal_all', 'all', privilegeVersions)).toBe(true);
      expect(isAnyMinimalPrivilegeId('minimal_all_v2', 'all', privilegeVersions)).toBe(true);
      expect(isAnyMinimalPrivilegeId('minimal_all_v3', 'all', privilegeVersions)).toBe(false);
    });

    it('#getReferencesExtractedAfter: bare id still implies the extracted grant, current id does not', () => {
      expect(getReferencesExtractedAfter('minimal_all', 'all', privilegeVersions)).toEqual(grant1);
      expect(getReferencesExtractedAfter('minimal_all_v2', 'all', privilegeVersions)).toEqual([]);
    });

    it('#getReferencesExtractedAfter returns nothing for an unrecognized id', () => {
      expect(getReferencesExtractedAfter('minimal_all_v99', 'all', privilegeVersions)).toEqual([]);
    });
  });

  describe('with two version entries (second extraction)', () => {
    const privilegeVersions = [
      { version: 'v2', extractedInto: grant1 },
      { version: 'v3', extractedInto: grant2 },
    ];

    it('#getAllMinimalPrivilegeIds returns all three ids in order', () => {
      expect(getAllMinimalPrivilegeIds('all', privilegeVersions)).toEqual([
        'minimal_all',
        'minimal_all_v2',
        'minimal_all_v3',
      ]);
    });

    it('#getCurrentMinimalPrivilegeId returns the latest id', () => {
      expect(getCurrentMinimalPrivilegeId('all', privilegeVersions)).toBe('minimal_all_v3');
    });

    it('the unversioned baseline still implies BOTH extracted grants', () => {
      expect(getReferencesExtractedAfter('minimal_all', 'all', privilegeVersions)).toEqual([
        ...grant1,
        ...grant2,
      ]);
    });

    it('a role customized between the two extractions keeps the second grant, not the first', () => {
      // This is the "second extraction doesn't break roles customized after the first"
      // acceptance criterion: a role stored with `minimal_all_v2` (i.e. saved after the first
      // extraction but before the second) must still resolve to grant2, and must NOT have
      // grant1 re-added (it was never entitled to it).
      expect(getReferencesExtractedAfter('minimal_all_v2', 'all', privilegeVersions)).toEqual(
        grant2
      );
    });

    it('the current id implies neither extracted grant', () => {
      expect(getReferencesExtractedAfter('minimal_all_v3', 'all', privilegeVersions)).toEqual([]);
    });
  });

  it('`all` and `read` versions are independent of each other', () => {
    const allVersions = [{ version: 'v2', extractedInto: grant1 }];
    expect(getCurrentMinimalPrivilegeId('all', allVersions)).toBe('minimal_all_v2');
    expect(getCurrentMinimalPrivilegeId('read')).toBe('minimal_read');
    expect(isAnyMinimalPrivilegeId('minimal_all_v2', 'read', allVersions)).toBe(false);
  });
});

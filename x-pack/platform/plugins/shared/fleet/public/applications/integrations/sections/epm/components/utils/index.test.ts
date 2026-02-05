/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryPolicyTemplate } from '../../../../types';

import { wrapTitle } from '.';

describe('wrapTitle', () => {
  describe('when title is provided directly', () => {
    it('should return title as-is when not deprecated', () => {
      expect(wrapTitle({ title: 'My Integration', deprecated: false })).toBe('My Integration');
    });

    it('should add (Deprecated) suffix when deprecated is true', () => {
      expect(wrapTitle({ title: 'My Integration', deprecated: true })).toBe(
        'My Integration (Deprecated)'
      );
    });

    it('should not add (Deprecated) suffix twice if already present', () => {
      expect(wrapTitle({ title: 'My Integration (deprecated)', deprecated: true })).toBe(
        'My Integration (deprecated)'
      );
    });

    it('should add suffix if capitalized (Deprecated) is present since regex only checks lowercase', () => {
      // The regex checks for lowercase "(deprecated)" only, so capitalized version gets suffix added
      expect(wrapTitle({ title: 'My Integration (Deprecated)', deprecated: true })).toBe(
        'My Integration (Deprecated) (Deprecated)'
      );
    });
  });

  describe('when title comes from integrationInfo', () => {
    const integrationInfo = {
      title: 'Integration Title',
    } as RegistryPolicyTemplate;

    it('should use integrationInfo.title when title is not provided', () => {
      expect(wrapTitle({ integrationInfo })).toBe('Integration Title');
    });

    it('should add (Deprecated) suffix when integrationInfo.deprecated is set', () => {
      const deprecatedIntegrationInfo = {
        ...integrationInfo,
        deprecated: { description: 'This integration is deprecated' },
      } as RegistryPolicyTemplate;

      expect(wrapTitle({ integrationInfo: deprecatedIntegrationInfo })).toBe(
        'Integration Title (Deprecated)'
      );
    });

    it('should prefer provided title over integrationInfo.title', () => {
      expect(wrapTitle({ title: 'Custom Title', integrationInfo })).toBe('Custom Title');
    });
  });

  describe('when title comes from packageInfo', () => {
    const packageInfo = {
      title: 'Package Title',
    } as PackageInfo;

    it('should use packageInfo.title when title and integrationInfo are not provided', () => {
      expect(wrapTitle({ packageInfo })).toBe('Package Title');
    });

    it('should add (Deprecated) suffix when packageInfo.deprecated is set', () => {
      const deprecatedPackageInfo = {
        ...packageInfo,
        deprecated: { description: 'This package is deprecated' },
      } as PackageInfo;

      expect(wrapTitle({ packageInfo: deprecatedPackageInfo })).toBe('Package Title (Deprecated)');
    });

    it('should add (Deprecated) suffix when packageInfo.conditions.deprecated is set', () => {
      const deprecatedPackageInfo = {
        ...packageInfo,
        conditions: { deprecated: { description: 'Deprecated via conditions' } },
      } as PackageInfo;

      expect(wrapTitle({ packageInfo: deprecatedPackageInfo })).toBe('Package Title (Deprecated)');
    });

    it('should prefer integrationInfo.title over packageInfo.title', () => {
      const integrationInfo = { title: 'Integration Title' } as RegistryPolicyTemplate;
      expect(wrapTitle({ packageInfo, integrationInfo })).toBe('Integration Title');
    });

    it('should prefer provided title over packageInfo.title', () => {
      expect(wrapTitle({ title: 'Custom Title', packageInfo })).toBe('Custom Title');
    });

    it('should return default title when no title source is provided', () => {
      expect(wrapTitle({ defaultTitle: 'Default Title' })).toBe('Default Title');
    });
  });

  describe('when no title source is provided', () => {
    it('should return empty string when nothing is provided', () => {
      expect(wrapTitle({})).toBe('');
    });

    it('should return empty string with (Deprecated) suffix when deprecated is true', () => {
      expect(wrapTitle({ deprecated: true })).toBe(' (Deprecated)');
    });
  });

  describe('priority of title sources', () => {
    const packageInfo = { title: 'Package Title' } as PackageInfo;
    const integrationInfo = { title: 'Integration Title' } as RegistryPolicyTemplate;

    it('should prioritize: title > integrationInfo.title > packageInfo.title', () => {
      expect(wrapTitle({ title: 'Direct Title', integrationInfo, packageInfo })).toBe(
        'Direct Title'
      );
      expect(wrapTitle({ integrationInfo, packageInfo })).toBe('Integration Title');
      expect(wrapTitle({ packageInfo })).toBe('Package Title');
    });
  });

  describe('priority of deprecation sources', () => {
    it('should be deprecated if any deprecation flag is set', () => {
      expect(wrapTitle({ title: 'Test', deprecated: true })).toBe('Test (Deprecated)');

      expect(
        wrapTitle({
          title: 'Test',
          packageInfo: { deprecated: { description: 'Deprecated' } } as PackageInfo,
        })
      ).toBe('Test (Deprecated)');

      expect(
        wrapTitle({
          title: 'Test',
          packageInfo: {
            conditions: { deprecated: { description: 'Deprecated via conditions' } },
          } as PackageInfo,
        })
      ).toBe('Test (Deprecated)');

      expect(
        wrapTitle({
          title: 'Test',
          integrationInfo: {
            deprecated: { description: 'Deprecated integration' },
          } as RegistryPolicyTemplate,
        })
      ).toBe('Test (Deprecated)');
    });

    it('should check all deprecation sources', () => {
      const packageInfo = {
        title: 'Test',
        conditions: { deprecated: { description: 'Deprecated' } },
      } as PackageInfo;

      expect(wrapTitle({ packageInfo })).toBe('Test (Deprecated)');
    });
  });

  describe('edge cases', () => {
    it('should handle null packageInfo', () => {
      expect(wrapTitle({ title: 'Test', packageInfo: null })).toBe('Test');
    });

    it('should handle undefined packageInfo', () => {
      expect(wrapTitle({ title: 'Test', packageInfo: undefined })).toBe('Test');
    });

    it('should handle empty string title', () => {
      expect(wrapTitle({ title: '' })).toBe('');
    });

    it('should handle title with only spaces', () => {
      expect(wrapTitle({ title: '   ', deprecated: true })).toBe('    (Deprecated)');
    });

    it('should handle deprecated suffix in middle of title (not at end)', () => {
      expect(wrapTitle({ title: 'My (deprecated) Integration', deprecated: true })).toBe(
        'My (deprecated) Integration (Deprecated)'
      );
    });

    it('should only match deprecated suffix at the end of the string', () => {
      expect(wrapTitle({ title: 'Integration (deprecated) v2', deprecated: true })).toBe(
        'Integration (deprecated) v2 (Deprecated)'
      );
    });
  });

  describe('real-world scenarios', () => {
    it('should handle a complete integration with all properties', () => {
      const packageInfo = {
        title: 'Apache HTTP Server',
      } as PackageInfo;
      const integrationInfo = {
        title: 'Apache Logs',
      } as RegistryPolicyTemplate;

      expect(wrapTitle({ packageInfo, integrationInfo })).toBe('Apache Logs');
    });

    it('should handle a deprecated integration with custom title', () => {
      const packageInfo = {
        title: 'Old Integration',
        deprecated: { description: 'This integration is deprecated' },
      } as PackageInfo;

      expect(wrapTitle({ title: 'Custom Old Integration', packageInfo })).toBe(
        'Custom Old Integration (Deprecated)'
      );
    });

    it('should handle integration deprecated via conditions', () => {
      const packageInfo = {
        title: 'Legacy Integration',
        conditions: {
          deprecated: { description: 'Legacy, please use the new version' },
        },
      } as PackageInfo;

      expect(wrapTitle({ packageInfo })).toBe('Legacy Integration (Deprecated)');
    });
  });
});

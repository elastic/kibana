/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOSSFeatures } from './oss_features';
import { featurePrivilegeIterator } from './feature_privilege_iterator';
import { KibanaFeature } from '.';
import type { LicenseType } from '@kbn/licensing-types';
import { LICENSE_TYPE } from '@kbn/licensing-types';

describe('buildOSSFeatures', () => {
  it('returns features including reporting subfeatures', () => {
    expect(
      buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeReporting: true,
      }).map(({ id, subFeatures }) => ({ id, subFeatures }))
    ).toMatchSnapshot();
  });

  it('returns features excluding reporting subfeatures', () => {
    expect(
      buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeReporting: false,
      }).map(({ id, subFeatures }) => ({ id, subFeatures }))
    ).toMatchSnapshot();
  });

  describe('aiIndex privileges', () => {
    it('grants ai_index read on dashboard to both dashboard feature variants', () => {
      const ossFeatures = buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeReporting: false,
      });

      for (const id of ['dashboard', 'dashboard_v2']) {
        const feature = ossFeatures.find((f) => f.id === id)!;
        expect(feature.privileges!.all.aiIndex).toEqual({ read: ['dashboard'] });
        expect(feature.privileges!.read.aiIndex).toEqual({ read: ['dashboard'] });
      }
    });

    it('grants ai_index read on visualization to both visualize feature variants', () => {
      const ossFeatures = buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeReporting: false,
      });

      for (const id of ['visualize', 'visualize_v2']) {
        const feature = ossFeatures.find((f) => f.id === id)!;
        expect(feature.privileges!.all.aiIndex).toEqual({ read: ['visualization'] });
        expect(feature.privileges!.read.aiIndex).toEqual({ read: ['visualization'] });
      }
    });

    it('does not grant ai_index read to features that did not opt in', () => {
      const ossFeatures = buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeReporting: false,
      });

      for (const id of ['discover', 'discover_v2', 'dev_tools', 'savedObjectsManagement']) {
        const feature = ossFeatures.find((f) => f.id === id)!;
        expect(feature.privileges!.all.aiIndex).toBeUndefined();
        expect(feature.privileges!.read.aiIndex).toBeUndefined();
      }
    });
  });

  const features = buildOSSFeatures({
    savedObjectTypes: ['foo', 'bar'],
    includeReporting: false,
  });
  features.forEach((featureConfig) => {
    (['enterprise', 'basic'] as LicenseType[]).forEach((licenseType) => {
      describe(`with a ${licenseType} license`, () => {
        it(`returns the ${featureConfig.id} feature augmented with appropriate sub feature privileges`, () => {
          const privileges = [];
          for (const featurePrivilege of featurePrivilegeIterator(
            new KibanaFeature(featureConfig),
            {
              augmentWithSubFeaturePrivileges: true,
              licenseHasAtLeast: (licenseTypeToCheck: LicenseType) =>
                LICENSE_TYPE[licenseTypeToCheck] <= LICENSE_TYPE[licenseType],
            }
          )) {
            privileges.push(featurePrivilege);
          }
          expect(privileges).toMatchSnapshot();
        });
      });
    });
  });
});

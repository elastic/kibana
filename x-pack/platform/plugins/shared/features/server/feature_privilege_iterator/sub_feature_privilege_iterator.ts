/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/server';
import type { KibanaFeature, SubFeaturePrivilegeConfig } from '../../common';

/**
 * Utility for iterating through all sub-feature privileges belonging to a specific feature.
 *
 * @param feature the feature whose sub-feature privileges to iterate through.
 * @param licenseType the current license.
 */
export type SubFeaturePrivilegeIterator = (
  feature: KibanaFeature,
  licenseHasAtLeast: (licenseType: LicenseType) => boolean | undefined
) => IterableIterator<SubFeaturePrivilegeConfig>;

const subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator =
  function* subFeaturePrivilegeIterator(
    feature: KibanaFeature,
    licenseHasAtLeast: (licenseType: LicenseType) => boolean | undefined
  ): IterableIterator<SubFeaturePrivilegeConfig> {
    for (const subFeature of feature.subFeatures) {
      for (const group of subFeature.privilegeGroups) {
        yield* group.privileges.filter(
          (privilege) => !privilege.minimumLicense || licenseHasAtLeast(privilege.minimumLicense)
        );
      }
    }
  };

export { subFeaturePrivilegeIterator };

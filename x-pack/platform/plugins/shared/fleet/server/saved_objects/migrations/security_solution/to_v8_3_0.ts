/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { cloneDeep } from 'lodash';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV830: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return packagePolicyDoc;
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> =
    cloneDeep(packagePolicyDoc);

  const input = updatedPackagePolicyDoc.attributes.inputs[0];

  if (input && input.config) {
    const policy = input.config.policy.value;

    const migratedPolicy = { event_filters: { default: false } };

    policy.windows.advanced = policy.windows.advanced
      ? { ...policy.windows.advanced, ...migratedPolicy }
      : { ...migratedPolicy };
    policy.mac.advanced = policy.mac.advanced
      ? { ...policy.mac.advanced, ...migratedPolicy }
      : { ...migratedPolicy };
    policy.linux.advanced = policy.linux.advanced
      ? { ...policy.linux.advanced, ...migratedPolicy }
      : { ...migratedPolicy };
  }

  return updatedPackagePolicyDoc;
};

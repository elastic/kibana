/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { cloneDeep } from 'lodash';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV7160: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return packagePolicyDoc;
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> =
    cloneDeep(packagePolicyDoc);

  const input = updatedPackagePolicyDoc.attributes.inputs[0];
  const memory = {
    mode: 'off',
    // This value is based on license.
    // For the migration, we add 'true', our license watcher will correct it, if needed, when the app starts.
    supported: true,
  };
  const memoryPopup = {
    message: '',
    enabled: false,
  };
  if (input && input.config) {
    const policy = input.config.policy.value;

    policy.mac.memory_protection = memory;
    policy.mac.popup.memory_protection = memoryPopup;
    policy.linux.memory_protection = memory;
    policy.linux.popup.memory_protection = memoryPopup;
  }

  return updatedPackagePolicyDoc;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { cloneDeep } from 'lodash';

import type { PackagePolicy } from '../../../../common';

export const migrateEndpointPackagePolicyToV7140: SavedObjectMigrationFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> =
    cloneDeep(packagePolicyDoc);
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    const input = updatedPackagePolicyDoc.attributes.inputs[0];
    if (input && input.config) {
      const policy = input.config.policy.value;
      const linuxMalware = cloneDeep(input.config.policy.value.windows.malware);
      const linuxMalwarePopup = {
        malware: cloneDeep(input.config.policy.value.windows.popup.malware),
      };

      policy.linux.malware = linuxMalware;
      policy.linux.popup = linuxMalwarePopup;

      // This value is based on license.
      // For the migration, we add 'true', our license watcher will correct it, if needed, when the app starts.
      if (policy?.windows?.ransomware?.mode) {
        policy.windows.ransomware.supported = true;
      } else {
        policy.windows.ransomware = { mode: 'off', supported: true };
      }
    }
  }

  return updatedPackagePolicyDoc;
};

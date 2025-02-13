/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

export const packagePolicyV13AdvancedFields: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return { attributes: packagePolicyDoc.attributes };
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  const input = updatedPackagePolicyDoc.attributes.inputs[0];

  if (input && input.config) {
    const policy = input.config.policy.value;

    policy.windows.advanced = {
      ...policy.windows.advanced,
      events: {
        deduplicate_network_events: false,
        process_ancestry_length: 20,
        ancestry_in_all_events: true,
        ...policy.windows.advanced?.events,
      },
    };

    policy.linux.advanced = {
      ...policy.linux.advanced,
      events: {
        deduplicate_network_events: false,
        process_ancestry_length: 20,
        ancestry_in_all_events: true,
        ...policy.linux.advanced?.events,
      },
    };

    policy.mac.advanced = {
      ...policy.mac.advanced,
      events: {
        deduplicate_network_events: false,
        process_ancestry_length: 20,
        ancestry_in_all_events: true,
        ...policy.mac.advanced?.events,
      },
    };
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};

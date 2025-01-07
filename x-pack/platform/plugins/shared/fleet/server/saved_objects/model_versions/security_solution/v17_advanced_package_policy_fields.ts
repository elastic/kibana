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

export const packagePolicyV17AdvancedFieldsForEndpointV818: SavedObjectModelDataBackfillFn<
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

    for (const os of ['windows', 'mac', 'linux']) {
      const policyPerOs = policy[os];

      policyPerOs.advanced = {
        set_extended_host_information: true,
        ...policyPerOs.advanced,

        events: {
          aggregate_process: false,
          aggregate_network: false,
          ...policyPerOs.advanced?.events,

          hash: {
            md5: true,
            sha1: true,
            ...policyPerOs.advanced?.events?.hash,
          },
        },

        alerts: {
          ...policyPerOs.advanced?.alerts,

          hash: {
            md5: true,
            sha1: true,
            ...policyPerOs.advanced?.alerts?.hash,
          },
        },
      };
    }
  }

  return {
    attributes: { ...updatedPackagePolicyDoc.attributes, bump_agent_policy_revision: true },
  };
};

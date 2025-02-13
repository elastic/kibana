/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import { omit } from 'lodash';

import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV8100: SavedObjectModelDataBackfillFn<
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

    const newMetaValues = { license_uid: '', cluster_uuid: '', cluster_name: '' };
    policy.meta = policy?.meta ? { ...policy.meta, ...newMetaValues } : newMetaValues;

    policy.windows.behavior_protection.reputation_service = false;
    policy.mac.behavior_protection.reputation_service = false;
    policy.linux.behavior_protection.reputation_service = false;
  }

  return {
    attributes: {
      inputs: updatedPackagePolicyDoc.attributes.inputs,
    },
  };
};

export const migratePackagePolicyEvictionsFromV8100: SavedObjectModelVersionForwardCompatibilityFn =
  (unknownAttributes) => {
    const attributes = unknownAttributes as PackagePolicy;
    if (attributes.package?.name !== 'endpoint') {
      return attributes;
    }

    const updatedAttributes = attributes;

    const input = updatedAttributes.inputs[0];

    if (input && input.config) {
      const policy = input.config.policy.value;

      policy.windows.behavior_protection = omit(policy.windows.behavior_protection, [
        'reputation_service',
      ]);
      policy.linux.behavior_protection = omit(policy.linux.behavior_protection, [
        'reputation_service',
      ]);
      policy.mac.behavior_protection = omit(policy.mac.behavior_protection, ['reputation_service']);
      policy.meta = omit(policy.meta, ['license_uid', 'cluster_uuid', 'cluster_name']);
    }

    return updatedAttributes;
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

export const migrateCspPackagePolicyToV8110: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.package?.name !== 'cloud_security_posture') {
    return { attributes: packagePolicyDoc.attributes };
  }

  const updatedAttributes = packagePolicyDoc.attributes;

  const gcpPackage = updatedAttributes.inputs.find((input) => input.type === 'cloudbeat/cis_gcp');

  if (gcpPackage) {
    const isGcpAccountTypeExists = Object.hasOwn(
      gcpPackage.streams[0]?.vars ?? {},
      'gcp.account_type'
    );

    if (!isGcpAccountTypeExists) {
      const migratedPolicy = { 'gcp.account_type': { value: 'single-account', type: 'text' } };
      gcpPackage.streams[0].vars = { ...(gcpPackage.streams[0].vars || {}), ...migratedPolicy };
    }
  }

  return {
    attributes: updatedAttributes,
  };
};

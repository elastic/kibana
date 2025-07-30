/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../common';

export const backfillPackagePolicyLatestRevision: SavedObjectModelDataBackfillFn<
  PackagePolicy & { latest_revision?: boolean },
  PackagePolicy & { latest_revision?: boolean }
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.latest_revision === undefined) {
    packagePolicyDoc.attributes.latest_revision = true;
  }

  return packagePolicyDoc;
};

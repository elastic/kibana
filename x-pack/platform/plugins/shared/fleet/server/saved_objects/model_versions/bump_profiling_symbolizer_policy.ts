/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import { FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE } from '../../../common/constants/epm';
import type { PackagePolicy } from '../../../common';

export const bumpProfilingSymbolizerPolicy: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.package?.name !== FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE) {
    return { attributes: packagePolicyDoc.attributes };
  }

  return {
    attributes: {
      ...packagePolicyDoc.attributes,
      bump_agent_policy_revision: true,
    },
  };
};

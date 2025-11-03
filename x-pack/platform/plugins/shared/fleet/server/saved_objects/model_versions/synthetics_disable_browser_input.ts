/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';

import { FLEET_SYNTHETICS_PACKAGE } from '../../../common/constants/epm';
import type { PackagePolicy } from '../../../common';

export const disableBrowserInputWhenBothEnabled: SavedObjectModelUnsafeTransformFn<
  PackagePolicy,
  PackagePolicy
> = (doc) => {
  const pkg = doc.attributes.package?.name;
  if (pkg !== FLEET_SYNTHETICS_PACKAGE) return { document: doc };

  const enabledInputs = doc.attributes.inputs.filter((i) => i.enabled);
  if (enabledInputs.length === 1) return { document: doc };

  for (const input of doc.attributes.inputs) {
    if (input.type === 'synthetics/browser') input.enabled = false;
  }

  return {
    document: { ...doc, attributes: { ...doc.attributes, bump_agent_policy_revision: true } },
  };
};

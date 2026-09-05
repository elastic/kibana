/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_ENTITY_PROVENANCE_ENABLED } from '../../../common';
import { isEntityProvenanceEnabled } from './entity_provenance';

describe('isEntityProvenanceEnabled', () => {
  it.each([
    [false, false],
    [true, true],
  ])('returns %s when the feature flag resolves to %s', async (expected, flagValue) => {
    const getBooleanValue = jest.fn().mockResolvedValue(flagValue);
    const featureFlags = { getBooleanValue } as unknown as FeatureFlagsStart;

    await expect(isEntityProvenanceEnabled(featureFlags)).resolves.toBe(expected);
    expect(getBooleanValue).toHaveBeenCalledWith(FF_ENTITY_PROVENANCE_ENABLED, false);
  });
});

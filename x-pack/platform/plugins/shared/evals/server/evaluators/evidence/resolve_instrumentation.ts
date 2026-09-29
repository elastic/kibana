/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSTRUMENTATION_PROFILES } from './profiles';
import type { InstrumentationProfile, InstrumentationProfileSpec } from './types';

export const getInstrumentationProfile = (
  profile: InstrumentationProfile
): InstrumentationProfileSpec => {
  const mapping = INSTRUMENTATION_PROFILES[profile];
  if (!mapping) {
    throw new Error(`Unknown instrumentation profile: ${profile}`);
  }

  return mapping;
};

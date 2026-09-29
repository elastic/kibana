/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

beforeAll(async () => {
  const { getLensFeatureFlags } = await vi.importActual('./get_feature_flags');
  const { apiFormat } = getLensFeatureFlags();

  if (!apiFormat) {
    return;
  }

  // Keep lazy_builder mockable in tests by loading actual module at runtime.
  const { setLensBuilder } = await vi.importActual('./lazy_builder');
  await setLensBuilder(apiFormat);
});

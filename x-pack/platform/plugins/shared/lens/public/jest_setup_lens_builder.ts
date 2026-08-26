/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

beforeAll(async () => {
  const { getLensFeatureFlags } = jest.requireActual('./get_feature_flags');
  const { apiFormat } = getLensFeatureFlags();

  if (!apiFormat) {
    return;
  }

  // Keep lazy_builder mockable in tests by loading actual module at runtime.
  const { setLensBuilder } = jest.requireActual('./lazy_builder');
  await setLensBuilder(apiFormat);
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesFeaturesAllRequired } from './types';

export * from './types';

/**
 * Cases features
 */

export const DEFAULT_FEATURES: CasesFeaturesAllRequired = Object.freeze({
  alerts: { sync: true, enabled: true, isExperimental: false },
  metrics: [],
});

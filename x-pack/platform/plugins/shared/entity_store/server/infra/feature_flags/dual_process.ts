/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_DUAL_PROCESS_ENABLED } from '../../../common';

/**
 * Whether the dual-process log extraction architecture is active for this deployment.
 * Reads from LaunchDarkly via core featureFlags; defaults to false so self-managed and
 * unreachable deployments always run single-process.
 */
export const isDualProcessEnabled = (featureFlags: FeatureFlagsStart): Promise<boolean> =>
  featureFlags.getBooleanValue(FF_DUAL_PROCESS_ENABLED, false);

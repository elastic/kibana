/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_ENTITY_PROVENANCE_ENABLED } from '../../../common';

/** Returns whether Entity Store may migrate and record entity provenance. */
export const isEntityProvenanceEnabled = (featureFlags: FeatureFlagsStart): Promise<boolean> =>
  featureFlags.getBooleanValue(FF_ENTITY_PROVENANCE_ENABLED, false);

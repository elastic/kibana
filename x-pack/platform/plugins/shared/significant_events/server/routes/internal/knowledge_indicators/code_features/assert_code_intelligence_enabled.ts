/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import { isCodeKiExtractionEnabled } from '../../../../lib/knowledge_indicators/code_intelligence/is_code_ki_extraction_enabled';

/** Live kill-switch check for every Code Intelligence workflow phase and write. */
export const assertCodeIntelligenceEnabled = async (
  featureFlags: FeatureFlagsStart
): Promise<void> => {
  if (!(await isCodeKiExtractionEnabled(featureFlags))) {
    throw new FeatureNotEnabledError('Code Intelligence extraction is disabled.');
  }
};

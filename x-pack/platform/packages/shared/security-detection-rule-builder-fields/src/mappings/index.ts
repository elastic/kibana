/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeBuilderFieldMappings } from '@kbn/alerting-v2-rule-builders';
import { commonDetectionRuleBuilderFieldMappings } from './common';
import { queryDetectionRuleBuilderFieldMappings } from './query';
import { thresholdDetectionRuleBuilderFieldMappings } from './threshold';

export { commonDetectionRuleBuilderFieldMappings } from './common';
export { queryDetectionRuleBuilderFieldMappings } from './query';
export { thresholdDetectionRuleBuilderFieldMappings } from './threshold';

/**
 * Every leaf a detection rule indexes. Merges declarations of the same leaf path
 * when they are identical (index, query, language) and throws when they differ.
 * Runs when the module loads, so a conflict surfaces in every test and every boot.
 *
 * This object never shrinks: a leaf that no schema produces any more keeps its mapping,
 * because some published version added it. "Current" means the mappings as they stand,
 * not the mappings the current schemas need.
 *
 * Becomes the manifest's currentMappings.
 */
export const detectionRuleBuilderFieldMappings = mergeBuilderFieldMappings(
  commonDetectionRuleBuilderFieldMappings,
  queryDetectionRuleBuilderFieldMappings,
  thresholdDetectionRuleBuilderFieldMappings
);

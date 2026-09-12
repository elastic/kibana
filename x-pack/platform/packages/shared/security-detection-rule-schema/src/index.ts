/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  threatTacticSchema,
  threatSubtechniqueSchema,
  threatTechniqueSchema,
  threatEntrySchema,
  detectionRuleCommonFields,
  DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS,
} from './detection_rule_common_fields';
export type { DetectionRuleCommonFields } from './detection_rule_common_fields';

export { DETECTION_RULE_TYPE_OWNERSHIP } from './type_ownership_map';

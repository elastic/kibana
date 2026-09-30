/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  type MappingProperty,
} from '@kbn/alerting-v2-rule-builders';

/** The fields only security.detection.query defines. */
export const queryDetectionRuleBuilderFieldMappings: Record<string, MappingProperty> = {
  index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  query: { type: 'text' },
  language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
};

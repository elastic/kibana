/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import { RULE_TAGS_RESPONSE, buildRuleOas, invalidResponseExample } from './rule_oas_shared';

const INVALID_RULE_TAGS_RESPONSE = invalidResponseExample({
  summary: 'Tags query filter exceeds the maximum length',
  message: 'filter: String must contain at most 1024 character(s)',
  details: { errors: { filter: ['String must contain at most 1024 character(s)'] } },
});

export const ruleTagsOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    responses: {
      200: {
        name: 'ruleTagsResponse',
        summary: 'Unique tags across matching rules',
        value: RULE_TAGS_RESPONSE,
      },
      400: INVALID_RULE_TAGS_RESPONSE,
    },
  });

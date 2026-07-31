/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTagsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';

export const RULE_TAGS_RESPONSE: RuleTagsResponse = {
  tags: ['production', 'infra', 'critical'],
};

const INVALID_RULE_TAGS_RESPONSE = invalidResponseExample({
  summary: 'Tags query filter exceeds the maximum length',
  message: 'filter: String must contain at most 1024 character(s)',
  details: { errors: { filter: ['String must contain at most 1024 character(s)'] } },
});

export const ruleTagsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'ruleTagsResponse',
        summary: 'Unique tags across matching rules',
        value: RULE_TAGS_RESPONSE,
      },
      400: INVALID_RULE_TAGS_RESPONSE,
    },
  });

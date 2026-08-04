/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTemplateTagsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';

export const RULE_TEMPLATE_TAGS_RESPONSE: RuleTemplateTagsResponse = {
  tags: ['nginx', 'observability', 'postgresql'],
};

const INVALID_RULE_TEMPLATE_TAGS_RESPONSE = invalidResponseExample({
  summary: 'Tags query search term is empty',
  message: 'search: String must contain at least 1 character(s)',
  details: { errors: { search: ['String must contain at least 1 character(s)'] } },
});

export const ruleTemplateTagsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'ruleTemplateTagsResponse',
        summary: 'Unique tags across the installed rule templates',
        value: RULE_TEMPLATE_TAGS_RESPONSE,
      },
      400: INVALID_RULE_TEMPLATE_TAGS_RESPONSE,
    },
  });

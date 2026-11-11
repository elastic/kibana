/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TAG_LENGTH } from '@kbn/alerting-v2-constants';
import type { RuleTemplateTagsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const RULE_TEMPLATE_TAGS_RESPONSE: RuleTemplateTagsResponse = {
  tags: ['production', 'infra', 'critical'],
};

const INVALID_RULE_TEMPLATE_TAGS_RESPONSE = invalidResponseExample({
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  message: `search: Too big: expected string to have <=${MAX_TAG_LENGTH} characters`,
  details: {
    errors: {
      errors: [],
      properties: {
        search: { errors: [`Too big: expected string to have <=${MAX_TAG_LENGTH} characters`] },
      },
    },
  },
});

export const ruleTemplateTagsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'ruleTemplateTagsResponse',
        summary: 'Unique tags across v2 rule templates',
        value: RULE_TEMPLATE_TAGS_RESPONSE,
      },
      400: INVALID_RULE_TEMPLATE_TAGS_RESPONSE,
    },
  });

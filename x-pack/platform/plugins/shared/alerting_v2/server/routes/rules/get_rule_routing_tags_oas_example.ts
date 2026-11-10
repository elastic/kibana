/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleRoutingTagsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const RULE_ROUTING_TAGS_RESPONSE: RuleRoutingTagsResponse = {
  tags: ['sre-oncall', 'payments'],
};

const INVALID_RULE_ROUTING_TAGS_RESPONSE = invalidResponseExample({
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  message: 'search: Too big: expected string to have <=256 characters',
  details: {
    errors: {
      errors: [],
      properties: {
        search: { errors: ['Too big: expected string to have <=256 characters'] },
      },
    },
  },
});

export const ruleRoutingTagsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'ruleRoutingTagsResponse',
        summary: 'Unique routing tags across rules',
        value: RULE_ROUTING_TAGS_RESPONSE,
      },
      400: INVALID_RULE_ROUTING_TAGS_RESPONSE,
    },
  });

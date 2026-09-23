/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleEventFieldsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const RULE_EVENT_FIELDS_RESPONSE: RuleEventFieldsResponse = [
  'host.name',
  'host.ip',
  'kibana.alert.rule.name',
];

const INVALID_RULE_EVENT_FIELDS_QUERY_RESPONSE = invalidResponseExample({
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  message: 'matcher: Too small: expected string to have >=1 characters',
  details: {
    errors: {
      errors: [],
      properties: {
        matcher: { errors: ['Too small: expected string to have >=1 characters'] },
      },
    },
  },
});

export const ruleEventFieldsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'ruleEventFieldsResponse',
        summary: 'Available rule event fields',
        value: RULE_EVENT_FIELDS_RESPONSE,
      },
      400: INVALID_RULE_EVENT_FIELDS_QUERY_RESPONSE,
    },
  });

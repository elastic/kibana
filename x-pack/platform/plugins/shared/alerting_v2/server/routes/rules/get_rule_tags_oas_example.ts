/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import { INVALID_RULE_DATA_EXAMPLE, RULE_TAGS_RESPONSE, buildRuleOas } from './rule_oas_shared';

export const ruleTagsOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    responses: {
      200: {
        name: 'ruleTagsResponse',
        summary: 'Unique tags across matching rules',
        value: RULE_TAGS_RESPONSE,
      },
      400: INVALID_RULE_DATA_EXAMPLE,
    },
  });

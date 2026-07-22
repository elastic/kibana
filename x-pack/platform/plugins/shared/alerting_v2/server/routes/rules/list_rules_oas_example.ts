/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import { INVALID_RULE_DATA_EXAMPLE, LIST_RULES_RESPONSE, buildRuleOas } from './rule_oas_shared';

export const listRulesOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    responses: {
      200: {
        name: 'listRulesResponse',
        summary: 'Paginated list containing one matching rule',
        value: LIST_RULES_RESPONSE,
      },
      400: INVALID_RULE_DATA_EXAMPLE,
    },
  });

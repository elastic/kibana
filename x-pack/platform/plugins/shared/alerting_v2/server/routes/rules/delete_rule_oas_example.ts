/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import { RULE_NOT_FOUND_RESPONSE, buildRuleOas } from './rule_oas_shared';

export const deleteRuleOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    responses: {
      404: RULE_NOT_FOUND_RESPONSE,
    },
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOasOperation } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  RULE_TEMPLATE_NOT_FOUND_RESPONSE,
  RULE_TEMPLATE_RESPONSE,
} from './rule_template_oas_shared_examples';

export const getRuleTemplateOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'getRuleTemplateResponse',
        summary: 'Nginx error rate rule template',
        value: RULE_TEMPLATE_RESPONSE,
      },
      404: RULE_TEMPLATE_NOT_FOUND_RESPONSE,
    },
  });

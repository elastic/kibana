/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTemplateTagsResponseSchema } from '@kbn/alerting-v2-schemas';
import { RULE_TEMPLATE_TAGS_RESPONSE } from './get_rule_template_tags_oas_example';

describe('rule template OAS example payloads', () => {
  it('keeps the tags response example valid against ruleTemplateTagsResponseSchema', () => {
    expect(ruleTemplateTagsResponseSchema.safeParse(RULE_TEMPLATE_TAGS_RESPONSE).success).toBe(
      true
    );
  });
});

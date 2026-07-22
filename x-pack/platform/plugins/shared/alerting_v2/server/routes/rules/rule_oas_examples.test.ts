/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkGetRulesParamsSchema,
  bulkGetRulesResponseSchema,
  bulkOperationParamsSchema,
  bulkOperationResponseSchema,
  createRuleDataSchema,
  findRulesResponseSchema,
  ruleResponseSchema,
  ruleTagsResponseSchema,
  updateRuleBodySchema,
} from '@kbn/alerting-v2-schemas';
import {
  BULK_GET_RULES_REQUEST,
  BULK_GET_RULES_RESPONSE,
  BULK_OPERATION_REQUEST,
  BULK_OPERATION_RESPONSE,
  CREATE_RULE_REQUEST,
  LIST_RULES_RESPONSE,
  RULE_RESPONSE,
  RULE_TAGS_RESPONSE,
  UPDATE_RULE_REQUEST,
} from './rule_oas_shared';

describe('rule OAS example payloads', () => {
  it('keeps create/upsert request examples valid against createRuleDataSchema', () => {
    expect(createRuleDataSchema.safeParse(CREATE_RULE_REQUEST).success).toBe(true);
  });

  it('keeps update request example valid against updateRuleBodySchema', () => {
    expect(updateRuleBodySchema.safeParse(UPDATE_RULE_REQUEST).success).toBe(true);
  });

  it('keeps bulk-get request example valid against bulkGetRulesParamsSchema', () => {
    expect(bulkGetRulesParamsSchema.safeParse(BULK_GET_RULES_REQUEST).success).toBe(true);
  });

  it('keeps bulk-operation request examples valid against bulkOperationParamsSchema', () => {
    expect(bulkOperationParamsSchema.safeParse(BULK_OPERATION_REQUEST).success).toBe(true);
  });

  it('keeps rule response examples valid against ruleResponseSchema', () => {
    expect(ruleResponseSchema.safeParse(RULE_RESPONSE).success).toBe(true);
  });

  it('keeps list response example valid against findRulesResponseSchema', () => {
    expect(findRulesResponseSchema.safeParse(LIST_RULES_RESPONSE).success).toBe(true);
  });

  it('keeps bulk-get response example valid against bulkGetRulesResponseSchema', () => {
    expect(bulkGetRulesResponseSchema.safeParse(BULK_GET_RULES_RESPONSE).success).toBe(true);
  });

  it('keeps bulk-operation response example valid against bulkOperationResponseSchema', () => {
    expect(bulkOperationResponseSchema.safeParse(BULK_OPERATION_RESPONSE).success).toBe(true);
  });

  it('keeps rule tags response example valid against ruleTagsResponseSchema', () => {
    expect(ruleTagsResponseSchema.safeParse(RULE_TAGS_RESPONSE).success).toBe(true);
  });
});

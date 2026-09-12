/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkByIdsSchema,
  bulkByQuerySchema,
  bulkGetRulesParamsSchema,
  bulkGetRulesResponseSchema,
  bulkResponseSchema,
  createRuleDataSchema,
  dryRunResponseSchema,
  findRulesResponseSchema,
  ruleResponseSchema,
  ruleTagsResponseSchema,
  updateRuleBodySchema,
} from '@kbn/alerting-v2-schemas';
import { BULK_GET_RULES_REQUEST, BULK_GET_RULES_RESPONSE } from './bulk_get_rules_oas_example';
import { RULE_TAGS_RESPONSE } from './get_rule_tags_oas_example';
import { LIST_RULES_RESPONSE } from './list_rules_oas_example';
import {
  BULK_BY_QUERY_REQUEST,
  BULK_OPERATION_REQUEST,
  BULK_OPERATION_RESPONSE,
  CREATE_RULE_REQUEST,
  DRY_RUN_RESPONSE,
  RULE_RESPONSE,
} from './rule_oas_shared_examples';
import { UPDATE_RULE_REQUEST } from './update_rule_oas_example';

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

  it('keeps bulk-operation request examples valid against bulkByIdsSchema', () => {
    expect(bulkByIdsSchema.safeParse(BULK_OPERATION_REQUEST).success).toBe(true);
  });

  it('keeps by-query request examples valid against bulkByQuerySchema', () => {
    expect(bulkByQuerySchema.safeParse(BULK_BY_QUERY_REQUEST).success).toBe(true);
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

  it('keeps bulk-operation response example valid against bulkResponseSchema', () => {
    expect(bulkResponseSchema.safeParse(BULK_OPERATION_RESPONSE).success).toBe(true);
  });

  it('keeps dry-run response example valid against dryRunResponseSchema', () => {
    expect(dryRunResponseSchema.safeParse(DRY_RUN_RESPONSE).success).toBe(true);
  });

  it('keeps rule tags response example valid against ruleTagsResponseSchema', () => {
    expect(ruleTagsResponseSchema.safeParse(RULE_TAGS_RESPONSE).success).toBe(true);
  });
});

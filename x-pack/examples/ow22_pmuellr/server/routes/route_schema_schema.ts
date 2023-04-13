/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import {
  PostWebhookRuleExampleRequestBody,
  PostWebhookRuleExampleRequestQuery,
  PostWebhookRuleExampleResponseBody,
} from './route_schema_types';

/** request body for POST webhook rule example */
export const PostWebhookRuleExampleRequestBodySchema = schema.object({
  /** the id of the rule being run */
  ruleId: schema.string(),
  /** execution UUID */
  executionId: schema.string(),
  /** rule parameters */
  params: schema.recordOf(schema.string(), schema.any()),
  /** old rule state from Kibana */
  state: schema.recordOf(schema.string(), schema.any()),
});

export function validatePostWebhookRuleExampleRequestBody(
  data: unknown
): PostWebhookRuleExampleRequestBody {
  return PostWebhookRuleExampleRequestBodySchema.validate(data);
}

/** query string for POST webhook rule example */
export const PostWebhookRuleExampleRequestQuerySchema = schema.object({
  /** use this param to make all instances active */
  active: schema.maybe(schema.string()),
  /** use this param to make all instances inactive */
  off: schema.maybe(schema.string()),
  /** use this param to make all instances randomly active */
  random: schema.maybe(schema.string()),
});

export function validatePostWebhookRuleExampleRequestQuery(
  data: unknown
): PostWebhookRuleExampleRequestQuery {
  return PostWebhookRuleExampleRequestQuerySchema.validate(data);
}

/** response body for POST webhook rule example */
export const PostWebhookRuleExampleResponseBodySchema = schema.object({
  /** new rule state to Kibana */
  state: schema.recordOf(schema.string(), schema.any()),
  /** one entry for every alert (instance) */
  instances: schema.arrayOf(
    schema.object({
      /** alert instance id - like host name, service, etc */
      instanceId: schema.string(),
      /** action group */
      actionGroup: schema.string(),
      /** context variables for actions */
      context: schema.recordOf(schema.string(), schema.any()),
    })
  ),
});

export function validatePostWebhookRuleExampleResponseBody(
  data: unknown
): PostWebhookRuleExampleResponseBody {
  return PostWebhookRuleExampleResponseBodySchema.validate(data);
}

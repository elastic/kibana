/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, IRouter } from 'kibana/server';
import { WebhookRuleActionGroupId } from '../../common';
import {
  PostWebhookRuleExampleRequestBodySchema,
  PostWebhookRuleExampleRequestQuerySchema,
  validatePostWebhookRuleExampleRequestBody,
  validatePostWebhookRuleExampleRequestQuery,
  validatePostWebhookRuleExampleResponseBody,
} from './route_schema_schema';
import { PostWebhookRuleExampleResponseBody } from './route_schema_types';

const routeConfig = {
  path: '/_dev/webhook_rule_example',
  validate: {
    body: PostWebhookRuleExampleRequestBodySchema,
    query: PostWebhookRuleExampleRequestQuerySchema,
  },
};

export function registerRoute(logger: Logger, router: IRouter): void {
  router.post(routeConfig, async (context, request, response) => {
    // const { duration, interval } = request.query;
    const { body, query } = request;

    const { ruleId, executionId, state } = validatePostWebhookRuleExampleRequestBody(body);
    logger.debug(`webhook server executing rule: ${ruleId} executionId: ${executionId}`);

    if (state.counter == null || typeof state.counter !== 'number') {
      state.counter = 1;
    } else {
      state.counter++;
    }

    const { active, off, random } = validatePostWebhookRuleExampleRequestQuery(query);
    logger.debug(`webhook active: "${active}", off: "${off}", random: "${random}"`);

    const ruleResponse: PostWebhookRuleExampleResponseBody = {
      state,
      instances: instancesForQuery(state.counter, active, off, random),
    };

    try {
      validatePostWebhookRuleExampleResponseBody(ruleResponse);
    } catch (err) {
      logger.warn(`error validating response: ${err}`);
    }

    return response.ok({
      body: ruleResponse,
    });
  });
}

type Instances = PostWebhookRuleExampleResponseBody['instances'];

function instancesForQuery(
  counter: number,
  active?: string,
  off?: string,
  random?: string
): Instances {
  const message = `webhook invoked ${counter} times for this rule`;
  const actionGroupContext = { [WebhookRuleActionGroupId]: { message } };
  const allActive = [
    { instanceId: 'Alfa', actionGroup: WebhookRuleActionGroupId, context: actionGroupContext },
    { instanceId: 'Bravo', actionGroup: WebhookRuleActionGroupId, context: actionGroupContext },
    { instanceId: 'Charlie', actionGroup: WebhookRuleActionGroupId, context: actionGroupContext },
    { instanceId: 'Delta', actionGroup: WebhookRuleActionGroupId, context: actionGroupContext },
  ];

  // passing query params with no value, eg ?xyz, yields an empty string!
  if (active === '') {
    return allActive;
  }

  if (off === '') {
    return [];
  }

  const randomActive: Instances = [];
  if (Math.random() > 0.5) randomActive.push(allActive[0]);
  if (Math.random() > 0.5) randomActive.push(allActive[1]);
  if (Math.random() > 0.5) randomActive.push(allActive[2]);
  if (Math.random() > 0.5) randomActive.push(allActive[3]);

  return randomActive;
}

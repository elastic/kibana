/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger, IRouter } from 'kibana/server';
import { WebhookRuleResponse, WebhookRuleActionGroupId, WebhookAlertInstance } from '../../common';

const routeValidation = {
  body: schema.object({
    ruleId: schema.string(),
    executionId: schema.string(),
    params: schema.recordOf(schema.string(), schema.any()),
    state: schema.recordOf(schema.string(), schema.any()),
  }),
  query: schema.object({
    active: schema.maybe(schema.string()),
    off: schema.maybe(schema.string()),
    random: schema.maybe(schema.string()),
  }),
};

const routeConfig = {
  path: '/_dev/webhook_rule_example',
  validate: routeValidation,
};

export function registerRoute(logger: Logger, router: IRouter): void {
  router.post(routeConfig, async (context, request, response) => {
    // const { duration, interval } = request.query;
    const { body, query } = request;

    const { ruleId, executionId, state } = body;
    logger.debug(`webhook server executing rule: ${ruleId} executionId: ${executionId}`);

    if (state.counter == null || typeof state.counter !== 'number') {
      state.counter = 1;
    } else {
      state.counter++;
    }

    const { active, off, random } = query;
    logger.debug(`webhook active: "${active}", off: "${off}", random: "${random}"`);

    const ruleResponse: WebhookRuleResponse = {
      state,
      instances: instancesForQuery(state.counter, active, off, random),
    };

    return response.ok({
      body: ruleResponse,
    });
  });
}

function instancesForQuery(counter: number, active?: string, off?: string, random?: string) {
  const message = `webhook invoked ${counter} times for this rule`;
  const actionGroupContext = { [WebhookRuleActionGroupId]: { message } };
  const allActive = {
    Alfa: actionGroupContext,
    Bravo: actionGroupContext,
    Charlie: actionGroupContext,
    Delta: actionGroupContext,
  };

  // passing query params with no value, eg ?xyz, yields an empty string!
  if (active === '') {
    return allActive;
  }

  if (off === '') {
    return {};
  }

  const randomActive: Record<string, WebhookAlertInstance> = {};
  if (Math.random() > 0.5) randomActive.Alfa = actionGroupContext;
  if (Math.random() > 0.5) randomActive.Bravo = actionGroupContext;
  if (Math.random() > 0.5) randomActive.Charlie = actionGroupContext;
  if (Math.random() > 0.5) randomActive.Delta = actionGroupContext;

  return randomActive;
}

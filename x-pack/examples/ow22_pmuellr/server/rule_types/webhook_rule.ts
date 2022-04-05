/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import { schema, TypeOf } from '@kbn/config-schema';

import {
  RuleType,
  AlertInstanceContext,
  AlertExecutorOptions,
} from '../../../../plugins/alerting/server';

import {
  RuleProducer,
  WebhookRuleId,
  WebhookRuleActionGroupId,
  WebhookRuleName,
} from '../../common';
import { createDeferred } from '../lib/deferred';

type Params = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  url: schema.string(),
});

interface ActionContext extends AlertInstanceContext {
  message: string;
}

export const ruleTypeWebhook: RuleType<
  Params,
  never,
  {},
  {},
  ActionContext,
  typeof WebhookRuleActionGroupId
> = {
  id: WebhookRuleId,
  name: WebhookRuleName,
  actionGroups: [{ id: WebhookRuleActionGroupId, name: WebhookRuleActionGroupId }],
  executor,
  defaultActionGroupId: WebhookRuleActionGroupId,
  validate: {
    params: ParamsSchema,
  },
  actionVariables: {
    context: [{ name: 'message', description: 'A pre-constructed message for the alert.' }],
    params: [{ name: 'url', description: 'url of webhook.' }],
  },
  minimumLicenseRequired: 'basic',
  isExportable: true,
  producer: RuleProducer,
  doesSetRecoveryContext: true,
};

async function executor(
  options: AlertExecutorOptions<Params, {}, {}, ActionContext, typeof WebhookRuleActionGroupId>
) {
  const { alertFactory } = options.services;
  const optionsStatic = omit(options, 'services');
  const url = options.params.url;

  const deferred = createDeferred();

  setTimeout(deferred.resolve, 1000);
  await deferred.promise;
}

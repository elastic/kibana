/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { createRuleDataSchema } from '../schemas';
import type { RuleParams } from '../../../types';

type CreateRuleDataType = TypeOf<typeof createRuleDataSchema>;

export interface CreateRuleData<Params extends RuleParams = never> {
  name: CreateRuleDataType['name'];
  alertTypeId: CreateRuleDataType['alertTypeId'];
  enabled: CreateRuleDataType['enabled'];
  consumer: CreateRuleDataType['consumer'];
  tags: CreateRuleDataType['tags'];
  throttle?: CreateRuleDataType['throttle'];
  params: Params;
  schedule: CreateRuleDataType['schedule'];
  actions: CreateRuleDataType['actions'];
  systemActions?: CreateRuleDataType['systemActions'];
  notifyWhen?: CreateRuleDataType['notifyWhen'];
  alertDelay?: CreateRuleDataType['alertDelay'];
  flapping?: CreateRuleDataType['flapping'];
  artifacts?: CreateRuleDataType['artifacts'];
}

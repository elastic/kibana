/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';

import {
  actionSchemaV2,
  actionFrequencySchemaV2,
  updateParamsSchemaV2,
  updateBodySchemaV2,
} from '..';

export type UpdateRuleAction = TypeOf<typeof actionSchemaV2>;
export type UpdateRuleActionFrequency = TypeOf<typeof actionFrequencySchemaV2>;

export type UpdateRuleRequestParams = TypeOf<typeof updateParamsSchemaV2>;
type UpdateBodySchema = TypeOf<typeof updateBodySchemaV2>;

export interface UpdateRuleRequestBody<Params extends RuleParamsV1 = never> {
  name: UpdateBodySchema['name'];
  tags: UpdateBodySchema['tags'];
  schedule: UpdateBodySchema['schedule'];
  throttle?: UpdateBodySchema['throttle'];
  params: Params;
  actions: UpdateBodySchema['actions'];
  notify_when?: UpdateBodySchema['notify_when'];
  alert_delay?: UpdateBodySchema['alert_delay'];
  flapping?: UpdateBodySchema['flapping'];
}

export interface UpdateRuleResponse<Params extends RuleParamsV1 = never> {
  body: RuleResponseV1<Params>;
}

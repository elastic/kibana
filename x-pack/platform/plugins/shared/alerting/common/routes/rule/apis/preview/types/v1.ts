/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';
import { actionSchemaV1, previewBodySchemaV1 } from '..';

export type PreviewRuleAction = TypeOf<typeof actionSchemaV1>;

type PreviewBodySchema = TypeOf<typeof previewBodySchemaV1>;

export interface PreviewRuleRequestBody<Params extends RuleParamsV1 = never> {
  name: PreviewBodySchema['name'];
  rule_type_id: PreviewBodySchema['rule_type_id'];
  consumer: PreviewBodySchema['consumer'];
  schedule: PreviewBodySchema['schedule'];
  tags: PreviewBodySchema['tags'];
  params: Params;
  actions: PreviewBodySchema['actions'];
}

export interface PreviewRuleResponse<Params extends RuleParamsV1 = never> {
  body: RuleResponseV1<Params>;
}

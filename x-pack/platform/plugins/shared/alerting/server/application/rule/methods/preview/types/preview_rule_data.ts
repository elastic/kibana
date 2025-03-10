/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { previewRuleDataSchema } from '../schemas';
import { RuleParams } from '../../../types';

type PreviewRuleDataType = TypeOf<typeof previewRuleDataSchema>;

export interface PreviewRuleData<Params extends RuleParams = never> {
  name: PreviewRuleDataType['name'];
  alertTypeId: PreviewRuleDataType['alertTypeId'];
  consumer: PreviewRuleDataType['consumer'];
  schedule: PreviewRuleDataType['schedule'];
  tags: PreviewRuleDataType['tags'];
  params: Params;
  actions: PreviewRuleDataType['actions'];
}

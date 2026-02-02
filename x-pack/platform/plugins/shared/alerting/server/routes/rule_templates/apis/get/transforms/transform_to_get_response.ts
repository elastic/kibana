/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformFlappingV1 } from '../../../../rule/transforms';
import type { RuleTemplateResponse } from '../../../../../../common/routes/rule_template/response/types/v1';
import type { RuleTemplate } from '../../../../../application/rule_template/types';

export const transformGetResponse = (ruleTemplate: RuleTemplate): RuleTemplateResponse => ({
  id: ruleTemplate.id,
  name: ruleTemplate.name,
  params: ruleTemplate.params,
  rule_type_id: ruleTemplate.ruleTypeId,
  schedule: ruleTemplate.schedule,
  tags: ruleTemplate.tags,
  ...(ruleTemplate.alertDelay ? { alert_delay: ruleTemplate.alertDelay } : {}),
  ...(ruleTemplate.flapping ? { flapping: transformFlappingV1(ruleTemplate.flapping) } : {}),
  ...(ruleTemplate.artifacts ? { artifacts: ruleTemplate.artifacts } : {}),
  ...(ruleTemplate.description ? { description: ruleTemplate.description } : {}),
});

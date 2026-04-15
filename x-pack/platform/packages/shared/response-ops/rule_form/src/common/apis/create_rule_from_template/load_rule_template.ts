/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import type { RuleTemplate } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../constants';
import { transformRuleTemplate } from '../../transformations';

export async function loadRuleTemplate({
  http,
  templateId,
}: {
  http: HttpSetup;
  templateId: string;
}): Promise<RuleTemplate> {
  const res = await http.get<AsApiContract<RuleTemplate>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule_template/${encodeURIComponent(templateId)}`
  );

  return transformRuleTemplate(res);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { i18n } from '@kbn/i18n';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';

export const ALERT_ACTION_ID = 'streams.esqlRule.alert';
export const ALERT_ACTION = {
  id: ALERT_ACTION_ID,
  name: i18n.translate('xpack.streams.alerting.esqlRule.alertAction', {
    defaultMessage: 'Alert',
  }),
};

export type EsqlRuleParams = z.infer<typeof esqlRuleParams>;
export const esqlRuleParams = z.object({
  type: z.literal('esql'),
  language: z.literal('esql'),
  query: z.string(),
});

export type EsqlAllowedActionGroups = ActionGroupIdsOf<typeof ALERT_ACTION>;

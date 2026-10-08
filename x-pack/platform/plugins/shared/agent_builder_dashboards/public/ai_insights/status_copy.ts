/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AI_INSIGHTS_STATUS } from '../../common/ai_insights/constants';
import type { AiInsightsStatus } from '../../common/ai_insights/types';

export const AI_INSIGHTS_STATUS_HEADLINE: Record<AiInsightsStatus, string> = {
  [AI_INSIGHTS_STATUS.green]: i18n.translate(
    'xpack.agentBuilderDashboards.aiInsights.status.green',
    { defaultMessage: 'Everything looks OK' }
  ),
  [AI_INSIGHTS_STATUS.yellow]: i18n.translate(
    'xpack.agentBuilderDashboards.aiInsights.status.yellow',
    { defaultMessage: 'A few things to watch' }
  ),
  [AI_INSIGHTS_STATUS.red]: i18n.translate('xpack.agentBuilderDashboards.aiInsights.status.red', {
    defaultMessage: 'Critical issues to check',
  }),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { dashboardTools, DASHBOARDS_SKILL_ID, getDashboardsSkillBadge } from './constants';
export { DASHBOARD_UPDATED_UI_EVENT } from './ui_events';
export type { DashboardUpdatedUiEventData } from './ui_events';
export {
  AI_INSIGHTS_EMBEDDABLE_TYPE,
  ADD_AI_INSIGHTS_ACTION_ID,
  AI_INSIGHTS_API_PATH,
} from './ai_insights/constants';
export type {
  AiInsightsResult,
  AiInsightsStatus,
  AiInsightsRequestBody,
  AiInsightsDashboardContext,
} from './ai_insights/types';
export { AI_INSIGHTS_STATUS } from './ai_insights/constants';
export {
  SEED_DATA_APP_ID,
  SEED_DATA_APP_PATH,
  SEED_DATA_API_PATH,
  SEED_DATA_FLIGHTS_ID,
  SEED_DATA_ECOMMERCE_ID,
  SEED_DATA_KUBERNETES_ID,
} from './seed_data/constants';

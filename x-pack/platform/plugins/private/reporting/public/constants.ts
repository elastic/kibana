/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APP_PATH = '/app/management/insightsAndAlerting/reporting' as const;
export const HOME_PATH = `/`;
export const REPORTING_EXPORTS_PATH = '/exports' as const;
export const REPORTING_SCHEDULES_PATH = '/schedules' as const;
export const EXPORTS_TAB_ID = 'exports' as const;
export const SCHEDULES_TAB_ID = 'schedules' as const;

export type Section = 'exports' | 'schedules';

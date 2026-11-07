/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerStatusEvents } from './register_events';

export const registerStatusAnalytics = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  registerStatusEvents({ analyticsService });
};

export { useStatusChangedEBT, useStatusConfigurationEditedEBT } from './use_status_ebt';
export type { StatusChangeEntryPoint, StatusConfigurationAction } from './use_status_ebt';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerObservablesEvents } from './register_observables_events';

/**
 * Registers every browser event for the observables feature. Add each new event family's register
 * function here rather than to the parent module, so the parent module keeps a single import and a
 * single call however many families are added.
 */
export const registerObservablesAnalytics = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  registerObservablesEvents({ analyticsService });
};

export { useObservablesDeletedEBT } from './use_observables_deleted_ebt';
export type { ObservableDeleteScope } from './use_observables_deleted_ebt';

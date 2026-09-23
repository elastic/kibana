/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NightshiftInvestigationsPublicPlugin } from './plugin';

export function plugin() {
  return new NightshiftInvestigationsPublicPlugin();
}

export type {
  NightshiftInvestigationsPublicSetup,
  NightshiftInvestigationsPublicStart,
} from './plugin';
export {
  NIGHTSHIFT_INVESTIGATION_LOCATOR_ID,
  NIGHTSHIFT_SEARCH_QUERY_PARAM,
  NIGHTSHIFT_SEVERITY_QUERY_PARAM,
  NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM,
  type InvestigationLocatorParams,
  type InvestigationLocator,
} from '../common/locators';
export type {
  NightshiftInvestigationsRepositoryClient,
  NightshiftInvestigationsEndpoint,
} from './api';
export { InvestigationDetailFlyout, InvestigationRunStatusBadge } from './components';
export type { InvestigationDetailFlyoutProps } from './components';

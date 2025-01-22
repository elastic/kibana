/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import type { ValuesType } from 'utility-types';

import { LOCATORS_IDS } from '../constants';

import { useStartServices } from './use_core';

export function useLocator<T extends SerializableRecord>(
  locatorId: ValuesType<typeof LOCATORS_IDS>
) {
  const services = useStartServices();
  return services.share.url.locators.get<T>(locatorId);
}

export function useDashboardLocator() {
  return useLocator(LOCATORS_IDS.DASHBOARD_APP);
}

export function useDiscoverLocator() {
  return useLocator(LOCATORS_IDS.DISCOVER_APP_LOCATOR);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterMetadata as ruleTagsFilterMetadata } from './components/alerts_filter_by_rule_tags';
import { filterMetadata as ruleTypesFilterMetadata } from './components/alerts_filter_by_rule_types';
import type { AlertsFilterMetadata, AlertsFiltersType } from './types';

export const alertsFiltersMetadata: Record<AlertsFiltersType, AlertsFilterMetadata<any>> = {
  ruleTags: ruleTagsFilterMetadata,
  ruleTypes: ruleTypesFilterMetadata,
};

export const getFilterMetadata = <T>(
  type: AlertsFilterMetadata<T>['id']
): AlertsFilterMetadata<T> => {
  const filterMetadata = alertsFiltersMetadata[type];

  if (!filterMetadata) {
    throw new Error(`Alerts filter of type ${type} not found`);
  }

  return filterMetadata;
};

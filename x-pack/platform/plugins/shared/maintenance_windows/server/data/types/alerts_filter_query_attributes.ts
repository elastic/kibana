/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterStateStore } from '@kbn/es-query';

export interface AlertsFilterAttributes {
  query?: Record<string, unknown>;
  meta: Record<string, unknown>;
  $state?: {
    store: FilterStateStore;
  };
}

/**
 * On-disk representation of a v1 alerting scope filter (MV4 shape, immutable).
 * Do NOT add `enabled` here — doing so would break the shipped MV4 forwardCompatibility
 * schema which requires `kql` + `filters` and has no `enabled` field.
 */
export interface AlertsFilterQueryAttributes {
  kql: string;
  filters: AlertsFilterAttributes[];
  dsl?: string;
}

export interface AlertingV2ScopeAttributes {
  enabled: boolean;
  kql?: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Classic alert KPI counts that have a v2 equivalent, merged additively with
 * the v2 KPI counts on the client.
 */
export interface ClassicAlertsKpisRow {
  alerts_count: number;
  firing_rules: number;
  acknowledged: number;
  snoozed: number;
}

/** Raw `kibana.alert.*` fields (plus `_index` / `_id`) of a single classic alert. */
export type ClassicAlertFields = Record<string, unknown>;

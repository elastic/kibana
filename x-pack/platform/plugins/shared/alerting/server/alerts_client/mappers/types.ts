/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '../../alert/alert';
import type { RulesSettingsFlappingProperties } from '../../types';
import type { LegacyAlertsClientParams } from '../legacy_alerts_client';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';

export enum AlertCategory {
  New, // alerts that are newly created in the current run
  Ongoing, // alerts that were active in the previous run and are still active in the current run
  Recovered, // alerts that were active in the previous run and are now recovered in the current run
  OngoingRecovered, // alerts that were recovered in the previous run and still recovered in the current run; we track these for a certain number of runs for flapping purposes
}

export const filterFor = <S extends State, C extends Context, G extends string>(
  alerts: AlertsResult<S, C, G>,
  category: AlertCategory
) => alerts.filter(({ category: cat }) => category === cat);

export const filterOut = <S extends State, C extends Context, G extends string>(
  alerts: AlertsResult<S, C, G>,
  category: AlertCategory
) => alerts.filter(({ category: cat }) => category !== cat);

export type AlertMapperFn = <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => Promise<AlertsResult<S, C, G>>;

export interface CategorizedAlert<S extends State, C extends Context, G extends string> {
  alert: Alert<S, C, G>;
  category: AlertCategory;
}
export type AlertsResult<S extends State, C extends Context, G extends string> = Array<
  CategorizedAlert<S, C, G>
>;

export interface MapperContext<
  S extends State,
  C extends Context,
  G extends string,
  R extends string
> {
  alertDelay: number;
  alertsClientContext: LegacyAlertsClientParams;
  flappingSettings: RulesSettingsFlappingProperties;
  hasReachedAlertLimit: boolean;
  maxAlerts: number;
  previousActiveAlerts: Map<string, Alert<S, C, G>>;
  previousRecoveredAlerts?: Map<string, Alert<S, C, R>>;
  ruleLogPrefix: string;
  shouldLogAlerts: boolean;
  startedAt: string;
}

export interface MapperOpts<
  S extends State,
  C extends Context,
  G extends string,
  R extends string
> {
  alerts: AlertsResult<S, C, G>;
  context: MapperContext<S, C, G, R>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '@kbn/timelines-plugin/common';
import * as runtimeTypes from 'io-ts';

export { Direction };

export type SortDirectionTable = 'none' | 'asc' | 'desc' | Direction;
export interface SortColumnTable {
  columnId: string;
  columnType: string;
  esTypes?: string[];
  sortDirection: SortDirectionTable;
}

export enum TableId {
  usersPageEvents = 'users-page-events',
  hostsPageEvents = 'hosts-page-events',
  networkPageEvents = 'network-page-events',
  hostsPageSessions = 'hosts-page-sessions-v2', // the v2 is to cache bust localstorage settings as default columns were reworked.
  alertsOnRuleDetailsPage = 'alerts-rules-details-page',
  alertsOnAlertsPage = 'alerts-page',
  test = 'table-test', // Reserved for testing purposes
  alternateTest = 'alternateTest',
  rulePreview = 'rule-preview',
  kubernetesPageSessions = 'kubernetes-page-sessions',
  alertsOnCasePage = 'alerts-case-page',
  alertsRiskInputs = 'alerts-risk-inputs',
  // New version of `alertsRiskInputs` designed to support multiple kinds of risk inputs
  riskInputs = 'risk-inputs',
}

export enum TableEntityType {
  alert = 'alert',
  event = 'event',
  session = 'session',
}

export const tableEntity: Record<TableId, TableEntityType> = {
  [TableId.alertsOnAlertsPage]: TableEntityType.alert,
  [TableId.alertsOnCasePage]: TableEntityType.alert,
  [TableId.alertsOnRuleDetailsPage]: TableEntityType.alert,
  [TableId.hostsPageEvents]: TableEntityType.event,
  [TableId.networkPageEvents]: TableEntityType.event,
  [TableId.usersPageEvents]: TableEntityType.event,
  [TableId.test]: TableEntityType.event,
  [TableId.alternateTest]: TableEntityType.event,
  [TableId.rulePreview]: TableEntityType.event,
  [TableId.hostsPageSessions]: TableEntityType.session,
  [TableId.kubernetesPageSessions]: TableEntityType.session,
  [TableId.alertsRiskInputs]: TableEntityType.alert,
  [TableId.riskInputs]: TableEntityType.alert,
} as const;

const TableIdLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TableId.usersPageEvents),
  runtimeTypes.literal(TableId.hostsPageEvents),
  runtimeTypes.literal(TableId.networkPageEvents),
  runtimeTypes.literal(TableId.hostsPageSessions),
  runtimeTypes.literal(TableId.alertsOnRuleDetailsPage),
  runtimeTypes.literal(TableId.alertsOnAlertsPage),
  runtimeTypes.literal(TableId.test),
  runtimeTypes.literal(TableId.rulePreview),
  runtimeTypes.literal(TableId.kubernetesPageSessions),
  runtimeTypes.literal(TableId.alertsOnCasePage),
  runtimeTypes.literal(TableId.alertsRiskInputs),
]);

export type TableIdLiteral = runtimeTypes.TypeOf<typeof TableIdLiteralRt>;

export const VIEW_SELECTION = {
  gridView: 'gridView',
  eventRenderedView: 'eventRenderedView',
} as const;

export type ViewSelectionTypes = keyof typeof VIEW_SELECTION;

export type ViewSelection = typeof VIEW_SELECTION[ViewSelectionTypes];

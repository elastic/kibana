/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { SavedObjectsClientContract } from 'kibana/server';
import {
  AlertsClient,
  PartialAlert,
  AlertType,
  State,
  AlertExecutorOptions,
} from '../../../../../../../plugins/alerting/server';
import { Alert, AlertAction } from '../../../../../../../plugins/alerting/common';
import { NOTIFICATIONS_ID } from '../../../../common/constants';
import { LegacyRequest } from '../../../types';
import { ActionsClient } from '../../../../../../../plugins/actions/server';
import { RuleAlertParams, RuleTypeParams, RuleAlertParamsRest } from '../types';

export type PatchRuleAlertParamsRest = Partial<RuleAlertParamsRest> & {
  id: string | undefined;
  notification_id: RuleAlertParams['notificationId'] | undefined;
};

export type UpdateRuleAlertParamsRest = RuleAlertParamsRest & {
  id: string | undefined;
  notification_id: RuleAlertParams['notificationId'] | undefined;
};

export interface FindParamsRest {
  per_page: number;
  page: number;
  sort_field: string;
  sort_order: 'asc' | 'desc';
  fields: string[];
  filter: string;
}

export interface PatchRulesRequest extends LegacyRequest {
  payload: PatchRuleAlertParamsRest;
}

export interface UpdateRulesRequest extends LegacyRequest {
  payload: UpdateRuleAlertParamsRest;
}

export interface RuleNotificationAlertType extends Alert {
  params: RuleTypeParams;
}

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}
export interface ImportRulesRequestParams {
  query: { overwrite: boolean };
  body: { file: HapiReadableStream };
}

export interface ExportRulesRequestParams {
  body: { objects: Array<{ notification_id: string }> | null | undefined };
  query: {
    file_name: string;
    exclude_export_details: boolean;
  };
}

export interface RuleRequestParams {
  id: string | undefined;
  notification_id: string | undefined;
}

export type ReadNotificationRequestParams = RuleRequestParams;
export type DeleteRuleRequestParams = RuleRequestParams;
export type DeleteRulesRequestParams = RuleRequestParams[];

export interface FindNotificationParams {
  alertsClient: AlertsClient;
  perPage?: number;
  page?: number;
  sortField?: string;
  filter?: string;
  fields?: string[];
  sortOrder?: 'asc' | 'desc';
}

export interface FindNotificationsRequestParams {
  per_page: number;
  page: number;
  search?: string;
  sort_field?: string;
  filter?: string;
  fields?: string[];
  sort_order?: 'asc' | 'desc';
}

export interface Clients {
  alertsClient: AlertsClient;
}

export type PatchNotificationParams = Partial<RuleAlertParams> & {
  id: string | undefined | null;
  savedObjectsClient: SavedObjectsClientContract;
} & Clients;

export type UpdateNotificationParams = Omit<NotificationAlertParams, 'interval'> & {
  id?: string;
  ruleId: string;
  tags?: string[];
  interval: string | null;
  ruleAlertId: string;
} & Clients;

export type DeleteNotificationParams = Clients & {
  id?: string | undefined;
  ruleId?: string | undefined | null;
};

export interface NotificationAlertParams {
  actions: AlertAction[];
  enabled: boolean;
  ruleAlertId: string;
  ruleId: string;
  interval: string;
  name: string;
  tags?: string[];
  throttle?: null;
}

export type CreateNotificationParams = NotificationAlertParams & Clients;

export interface ReadNotificationParams {
  alertsClient: AlertsClient;
  id?: string | undefined | null;
  ruleId?: string | undefined | null;
}

export const isAlertTypes = (
  partialAlert: PartialAlert[]
): partialAlert is RuleNotificationAlertType[] => {
  return partialAlert.every(rule => isAlertType(rule));
};

export const isAlertType = (
  partialAlert: PartialAlert
): partialAlert is RuleNotificationAlertType => {
  return partialAlert.alertTypeId === NOTIFICATIONS_ID;
};

export type NotificationExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: NotificationAlertParams;
};

// This returns true because by default a NotificationAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isNotificationAlertExecutor = (
  obj: NotificationAlertTypeDefinition
): obj is AlertType => {
  return true;
};

export type NotificationAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: NotificationExecutorOptions) => Promise<State | void>;
};

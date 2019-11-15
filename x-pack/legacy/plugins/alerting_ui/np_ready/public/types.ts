/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type ActionTypeIndex = Record<string, ActionType>;
export type AlertTypeIndex = Record<string, AlertType>;

export interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

export interface ParamsProps {
  action: any;
  editAction: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

export interface Pagination {
  index: number;
  size: number;
}

export interface ActionTypeModel {
  id: string;
  iconClass: string;
  selectMessage: string;
  validate: (action: Action) => ValidationResult;
  actionFields: React.FunctionComponent<Props> | null;
  actionParamsFields: React.FunctionComponent<ParamsProps> | null;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

export interface ActionType {
  id: string;
  name: string;
}

export interface Action {
  secrets: Record<string, any>;
  id: string;
  actionTypeId: string;
  description: string;
  referencedByCount: number;
  config: Record<string, any>;
}

export interface ActionTableItem extends Action {
  actionType: ActionType['name'];
}

export interface AlertType {
  id: string;
  name: string;
}

export interface AlertAction {
  group: string;
  id: string;
  params: Record<string, any>;
}

export interface Alert {
  id: string;
  name: string;
  enabled: boolean;
  alertTypeId: string;
  interval: string;
  actions: AlertAction[];
  alertTypeParams: Record<string, any>;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  apiKeyOwner?: string;
  throttle: string | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  // TODO: replace this temporary fields with the proper server relevant
  checkIntervalSize?: number;
  checkIntervalUnit?: string;
  renotifyIntervalSize?: number;
  renotifyIntervalUnit?: string;
}

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
}

export interface AlertTypeModel {
  id: string;
  name: string;
  iconClass: string;
  validate: (alert: Alert) => ValidationResult;
  alertTypeParamsExpression: React.FunctionComponent<any>;
}

export interface IErrorObject {
  [key: string]: string[];
}

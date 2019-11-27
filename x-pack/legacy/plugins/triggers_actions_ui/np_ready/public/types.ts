/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type ActionTypeIndex = Record<string, ActionType>;
export type AlertTypeIndex = Record<string, AlertType>;

export interface ActionConnectorFieldsProps {
  action: ActionConnector;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

export interface ActionParamsProps {
  action: any;
  index: number;
  editAction: (property: string, value: any, index: number) => void;
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
  validateConnector: (action: ActionConnector) => ValidationResult;
  validateParams: (actionParams: any) => ValidationResult;
  actionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> | null;
  actionParamsFields: React.FunctionComponent<ActionParamsProps> | null;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

export interface ActionType {
  id: string;
  name: string;
}

export interface ActionConnector {
  secrets: Record<string, any>;
  id: string;
  actionTypeId: string;
  description: string;
  referencedByCount?: number;
  config: Record<string, any>;
}

export interface ActionConnectorTableItem extends ActionConnector {
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
  tags: string[];
  enabled: boolean;
  alertTypeId: string;
  interval: string;
  actions: AlertAction[];
  params: Record<string, any>;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  apiKeyOwner?: string;
  throttle: string | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
}

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
  tagsText: string;
}

export interface AlertTypeModel {
  id: string;
  name: string;
  iconClass: string;
  validate: (alert: Alert) => ValidationResult;
  alertParamsExpression: React.FunctionComponent<any>;
}

export interface IErrorObject {
  [key: string]: string[];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes, SavedObjectsClientContract } from 'src/core/server';
import { AlertInstance } from './lib';
import { AlertTypeRegistry } from './alert_type_registry';

export type State = Record<string, any>;
export type Context = Record<string, any>;
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;

export type Log = (
  tags: string | string[],
  data?: string | object | (() => any),
  timestamp?: number
) => void;

export interface Services {
  log: Log;
  callCluster(path: string, opts: any): Promise<any>;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface AlertServices extends Services {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertExecutorOptions {
  startedAt: Date;
  previousStartedAt?: Date;
  services: AlertServices;
  params: Record<string, any>;
  state: State;
}

export interface AlertType {
  id: string;
  name: string;
  validate?: {
    params?: { validate: (object: any) => any };
  };
  executor: ({ services, params, state }: AlertExecutorOptions) => Promise<State | void>;
}

export type AlertActionParams = SavedObjectAttributes;

export interface AlertAction {
  group: string;
  id: string;
  params: AlertActionParams;
}

export interface RawAlertAction extends SavedObjectAttributes {
  group: string;
  actionRef: string;
  params: AlertActionParams;
}

export interface Alert {
  enabled: boolean;
  alertTypeId: string;
  interval: string;
  actions: AlertAction[];
  alertTypeParams: Record<string, any>;
  scheduledTaskId?: string;
}

export interface RawAlert extends SavedObjectAttributes {
  enabled: boolean;
  alertTypeId: string;
  interval: string;
  actions: RawAlertAction[];
  alertTypeParams: SavedObjectAttributes;
  scheduledTaskId?: string;
}

export interface AlertingPlugin {
  registerType: AlertTypeRegistry['register'];
  listTypes: AlertTypeRegistry['list'];
}

export type AlertTypeRegistry = PublicMethodsOf<AlertTypeRegistry>;

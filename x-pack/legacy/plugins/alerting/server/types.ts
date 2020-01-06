/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './lib';
import { AlertTypeRegistry as OrigAlertTypeRegistry } from './alert_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { SavedObjectAttributes, SavedObjectsClientContract } from '../../../../../src/core/server';

export type State = Record<string, any>;
export type Context = Record<string, any>;
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: any) => Services;
export type GetBasePathFunction = (spaceId?: string) => string;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

export interface Services {
  callCluster(path: string, opts: any): Promise<any>;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface AlertServices extends Services {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertExecutorOptions {
  alertId: string;
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
  actionGroups: string[];
  executor: ({ services, params, state }: AlertExecutorOptions) => Promise<State | void>;
}

export type AlertActionParams = SavedObjectAttributes;

export interface AlertAction {
  group: string;
  id: string;
  actionTypeId: string;
  params: AlertActionParams;
}

export interface RawAlertAction extends SavedObjectAttributes {
  group: string;
  actionRef: string;
  actionTypeId: string;
  params: AlertActionParams;
}

export interface IntervalSchedule extends SavedObjectAttributes {
  interval: string;
}

export interface Alert {
  id: string;
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string;
  consumer: string;
  schedule: IntervalSchedule;
  actions: AlertAction[];
  params: Record<string, any>;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  apiKey: string | null;
  apiKeyOwner: string | null;
  throttle: string | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
}

export type PartialAlert = Pick<Alert, 'id'> & Partial<Omit<Alert, 'id'>>;

export interface RawAlert extends SavedObjectAttributes {
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string;
  consumer: string;
  schedule: SavedObjectAttributes;
  actions: RawAlertAction[];
  params: SavedObjectAttributes;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  apiKey: string | null;
  apiKeyOwner: string | null;
  throttle: string | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
}

export interface AlertingPlugin {
  setup: PluginSetupContract;
  start: PluginStartContract;
}

export type AlertTypeRegistry = PublicMethodsOf<OrigAlertTypeRegistry>;

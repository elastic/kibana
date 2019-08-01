/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { ActionTypeRegistry } from './action_type_registry';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (basePath: string, overwrites?: Partial<Services>) => Services;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;

export interface Services {
  callCluster(path: string, opts: any): Promise<any>;
  savedObjectsClient: SavedObjectsClientContract;
  log: (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => void;
}

export interface ActionsPlugin {
  registerType: ActionTypeRegistry['register'];
  listTypes: ActionTypeRegistry['list'];
  fire(options: { id: string; params: Record<string, any>; basePath: string }): Promise<void>;
}

// the parameters passed to an action type executor function
export interface ActionTypeExecutorOptions {
  id: string;
  services: Services;
  config: Record<string, any>;
  secrets: Record<string, any>;
  params: Record<string, any>;
}

export interface ActionResult {
  id: string;
  actionTypeId: string;
  description: string;
  config: Record<string, any>;
}

// the result returned from an action type executor function
export interface ActionTypeExecutorResult {
  status: 'ok' | 'error';
  message?: string;
  data?: any;
  retry?: null | boolean | Date;
}

// signature of the action type executor function
export type ExecutorType = (
  options: ActionTypeExecutorOptions
) => Promise<ActionTypeExecutorResult>;

interface ValidatorType {
  validate<T>(value: any): any;
}

export interface ActionType {
  id: string;
  name: string;
  maxAttempts?: number;
  validate?: {
    params?: ValidatorType;
    config?: ValidatorType;
    secrets?: ValidatorType;
  };
  executor: ExecutorType;
}

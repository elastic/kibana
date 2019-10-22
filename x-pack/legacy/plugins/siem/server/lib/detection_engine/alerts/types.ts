/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import Hapi from 'hapi';
import { SIGNALS_ID } from '../../../../common/constants';
import {
  Alert,
  AlertType,
  State,
  AlertExecutorOptions,
} from '../../../../../alerting/server/types';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { SearchResponse } from '../../types';

export interface SignalAlertParams {
  description: string;
  from: string;
  id: string;
  index: string[];
  interval: string;
  enabled: boolean;
  filter: Record<string, {}> | undefined;
  kql: string | undefined;
  maxSignals: string;
  name: string;
  severity: string;
  type: 'filter' | 'kql';
  to: string;
  references: string[];
}

export interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

export type SignalParams = SignalAlertParams & Clients;

export type DeleteSignalParams = Clients & { id: string };

export interface FindSignalsRequest extends Omit<Hapi.Request, 'query'> {
  query: {
    per_page: number;
    page: number;
    search?: string;
    sort_field?: string;
    fields?: string[];
  };
}

export interface FindSignalParams {
  alertsClient: AlertsClient;
  perPage?: number;
  page?: number;
  sortField?: string;
  fields?: string[];
}

export interface ReadSignalParams {
  alertsClient: AlertsClient;
  id: string;
}

export type SignalAlertType = Alert & {
  id: string;
  alertTypeParams: SignalAlertParams;
};

export interface SignalsRequest extends Hapi.Request {
  payload: Omit<SignalAlertParams, 'maxSignals'> & {
    max_signals: string;
  };
}

export type SignalExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: SignalAlertParams & {
    scrollSize: number;
    scrollLock: string;
  };
};

export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[];

export interface SignalSource {
  [key: string]: SearchTypes;
  '@timestamp': string;
}

export type SignalSearchResponse = SearchResponse<SignalSource>;
export type SignalSourceHit = SignalSearchResponse['hits']['hits'][0];

// This returns true because by default a SignalAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (obj: SignalAlertTypeDefinition): obj is AlertType => {
  return true;
};

export type SignalAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: SignalExecutorOptions) => Promise<State | void>;
};

export const isAlertType = (obj: unknown): obj is SignalAlertType => {
  return get('alertTypeId', obj) === SIGNALS_ID;
};

export const isAlertTypeArray = (objArray: unknown[]): objArray is SignalAlertType[] => {
  return objArray.length === 0 || isAlertType(objArray[0]);
};

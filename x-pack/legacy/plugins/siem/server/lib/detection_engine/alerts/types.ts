/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { SIGNALS_ID } from '../../../../common/constants';
import {
  Alert,
  AlertType,
  State,
  AlertExecutorOptions,
} from '../../../../../alerting/server/types';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { RequestFacade } from '../../../types';
import { SearchResponse } from '../../types';
import { esFilters } from '../../../../../../../../src/plugins/data/server';

export type PartialFilter = Partial<esFilters.Filter>;

export interface SignalAlertParams {
  description: string;
  enabled: boolean;
  falsePositives: string[];
  filter: Record<string, {}> | undefined | null;
  filters: PartialFilter[] | undefined | null;
  from: string;
  immutable: boolean;
  index: string[];
  interval: string;
  ruleId: string | undefined | null;
  language: string | undefined | null;
  maxSignals: number;
  name: string;
  query: string | undefined | null;
  references: string[];
  savedId: string | undefined | null;
  severity: string;
  size: number | undefined | null;
  tags: string[];
  to: string;
  type: 'filter' | 'query' | 'saved_query';
}

export type SignalAlertParamsRest = Omit<
  SignalAlertParams,
  'ruleId' | 'falsePositives' | 'maxSignals' | 'savedId'
> & {
  rule_id: SignalAlertParams['ruleId'];
  false_positives: SignalAlertParams['falsePositives'];
  saved_id: SignalAlertParams['savedId'];
  max_signals: SignalAlertParams['maxSignals'];
};

export type OutputSignalAlertRest = SignalAlertParamsRest & {
  id: string;
  created_by: string | undefined | null;
  updated_by: string | undefined | null;
};

export type UpdateSignalAlertParamsRest = Partial<SignalAlertParamsRest> & {
  id: string | undefined;
  rule_id: SignalAlertParams['ruleId'] | undefined;
};

export interface FindParamsRest {
  per_page: number;
  page: number;
  sort_field: string;
  fields: string[];
}

export interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

export type SignalParams = SignalAlertParams & Clients;

export type UpdateSignalParams = Partial<SignalAlertParams> & {
  id: string | undefined | null;
} & Clients;

export type DeleteSignalParams = Clients & {
  id: string | undefined;
  ruleId: string | undefined | null;
};

export interface FindSignalsRequest extends Omit<RequestFacade, 'query'> {
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
  id?: string | undefined | null;
  ruleId?: string | undefined | null;
}

export interface ReadSignalByRuleId {
  alertsClient: AlertsClient;
  ruleId: string;
}

export type AlertTypeParams = Omit<SignalAlertParams, 'name' | 'enabled' | 'interval'>;

export type SignalAlertType = Alert & {
  id: string;
  alertTypeParams: AlertTypeParams;
};

export interface SignalsRequest extends RequestFacade {
  payload: SignalAlertParamsRest;
}

export interface UpdateSignalsRequest extends RequestFacade {
  payload: UpdateSignalAlertParamsRest;
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

export interface BulkResponse {
  took: number;
  errors: boolean;
  items: unknown[];
}

export type SignalSearchResponse = SearchResponse<SignalSource>;
export type SignalSourceHit = SignalSearchResponse['hits']['hits'][0];

export type QueryRequest = Omit<RequestFacade, 'query'> & {
  query: { id: string | undefined; rule_id: string | undefined };
};

// This returns true because by default a SignalAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (obj: SignalAlertTypeDefinition): obj is AlertType => {
  return true;
};

export type SignalAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: SignalExecutorOptions) => Promise<State | void>;
};

export const isAlertTypes = (obj: unknown[]): obj is SignalAlertType[] => {
  return obj.every(signal => isAlertType(signal));
};

export const isAlertType = (obj: unknown): obj is SignalAlertType => {
  return get('alertTypeId', obj) === SIGNALS_ID;
};

export const isAlertTypeArray = (objArray: unknown[]): objArray is SignalAlertType[] => {
  return objArray.length === 0 || isAlertType(objArray[0]);
};

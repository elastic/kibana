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

export interface IMitreAttack {
  id: string;
  name: string;
  reference: string;
}
export interface ThreatParams {
  framework: string;
  tactic: IMitreAttack;
  techniques: IMitreAttack[];
}
export interface RuleAlertParams {
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
  riskScore: number;
  outputIndex: string;
  name: string;
  query: string | undefined | null;
  references: string[];
  savedId: string | undefined | null;
  meta: Record<string, {}> | undefined | null;
  severity: string;
  tags: string[];
  to: string;
  threats: ThreatParams[] | undefined | null;
  type: 'filter' | 'query' | 'saved_query';
}

export type RuleAlertParamsRest = Omit<
  RuleAlertParams,
  'ruleId' | 'falsePositives' | 'maxSignals' | 'savedId' | 'riskScore' | 'outputIndex'
> & {
  rule_id: RuleAlertParams['ruleId'];
  false_positives: RuleAlertParams['falsePositives'];
  saved_id: RuleAlertParams['savedId'];
  max_signals: RuleAlertParams['maxSignals'];
  risk_score: RuleAlertParams['riskScore'];
  output_index: RuleAlertParams['outputIndex'];
};

export interface SignalsParams {
  signalIds: string[] | undefined | null;
  query: object | undefined | null;
  status: 'open' | 'closed';
}

export type SignalsRestParams = Omit<SignalsParams, 'signalIds'> & {
  signal_ids: SignalsParams['signalIds'];
};

export type OutputRuleAlertRest = RuleAlertParamsRest & {
  id: string;
  created_by: string | undefined | null;
  updated_by: string | undefined | null;
};

export type UpdateRuleAlertParamsRest = Partial<RuleAlertParamsRest> & {
  id: string | undefined;
  rule_id: RuleAlertParams['ruleId'] | undefined;
};

export interface FindParamsRest {
  per_page: number;
  page: number;
  sort_field: string;
  sort_order: 'asc' | 'desc';
  fields: string[];
  filter: string;
}

export interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

export type RuleParams = RuleAlertParams & Clients;

export type UpdateRuleParams = Partial<RuleAlertParams> & {
  id: string | undefined | null;
} & Clients;

export type DeleteRuleParams = Clients & {
  id: string | undefined;
  ruleId: string | undefined | null;
};

export interface FindRulesRequest extends Omit<RequestFacade, 'query'> {
  query: {
    per_page: number;
    page: number;
    search?: string;
    sort_field?: string;
    filter?: string;
    fields?: string[];
    sort_order?: 'asc' | 'desc';
  };
}

export interface FindRuleParams {
  alertsClient: AlertsClient;
  perPage?: number;
  page?: number;
  sortField?: string;
  filter?: string;
  fields?: string[];
  sortOrder?: 'asc' | 'desc';
}

export interface ReadRuleParams {
  alertsClient: AlertsClient;
  id?: string | undefined | null;
  ruleId?: string | undefined | null;
}

export interface ReadRuleByRuleId {
  alertsClient: AlertsClient;
  ruleId: string;
}

export type RuleTypeParams = Omit<RuleAlertParams, 'name' | 'enabled' | 'interval'>;

export type RuleAlertType = Alert & {
  id: string;
  params: RuleTypeParams;
};

export interface RulesRequest extends RequestFacade {
  payload: RuleAlertParamsRest;
}

export interface SignalsRequest extends RequestFacade {
  payload: SignalsRestParams;
}

export interface UpdateRulesRequest extends RequestFacade {
  payload: UpdateRuleAlertParamsRest;
}

export type RuleExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: RuleAlertParams & {
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
  items: [
    {
      create: {
        _index: string;
        _type?: string;
        _id: string;
        _version: number;
        result?: string;
        _shards?: {
          total: number;
          successful: number;
          failed: number;
        };
        _seq_no?: number;
        _primary_term?: number;
        status: number;
        error?: {
          type: string;
          reason: string;
          index_uuid?: string;
          shard: string;
          index: string;
        };
      };
    }
  ];
}

export interface MGetResponse {
  docs: GetResponse[];
}
export interface GetResponse {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  _seq_no: number;
  _primary_term: number;
  found: boolean;
  _source: SearchTypes;
}

export type SignalSearchResponse = SearchResponse<SignalSource>;
export type SignalSourceHit = SignalSearchResponse['hits']['hits'][0];

export type QueryRequest = Omit<RequestFacade, 'query'> & {
  query: { id: string | undefined; rule_id: string | undefined };
};

// This returns true because by default a RuleAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (obj: RuleAlertTypeDefinition): obj is AlertType => {
  return true;
};

export type RuleAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: RuleExecutorOptions) => Promise<State | void>;
};

export const isAlertTypes = (obj: unknown[]): obj is RuleAlertType[] => {
  return obj.every(rule => isAlertType(rule));
};

export const isAlertType = (obj: unknown): obj is RuleAlertType => {
  return get('alertTypeId', obj) === SIGNALS_ID;
};

export const isAlertTypeArray = (objArray: unknown[]): objArray is RuleAlertType[] => {
  return objArray.length === 0 || isAlertType(objArray[0]);
};

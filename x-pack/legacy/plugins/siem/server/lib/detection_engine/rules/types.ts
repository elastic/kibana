/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { Readable } from 'stream';

import { SIGNALS_ID } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { RuleAlertParams, RuleTypeParams, RuleAlertParamsRest } from '../types';
import { RequestFacade } from '../../../types';
import { Alert } from '../../../../../alerting/server/types';

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

export interface UpdateRulesRequest extends RequestFacade {
  payload: UpdateRuleAlertParamsRest;
}

export interface BulkUpdateRulesRequest extends RequestFacade {
  payload: UpdateRuleAlertParamsRest[];
}

export type RuleAlertType = Alert & {
  id: string;
  params: RuleTypeParams;
};

export interface RulesRequest extends RequestFacade {
  payload: RuleAlertParamsRest;
}

export interface BulkRulesRequest extends RequestFacade {
  payload: RuleAlertParamsRest[];
}

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}
export interface ImportRulesRequest extends RequestFacade {
  payload: HapiReadableStream;
}

export type QueryRequest = Omit<RequestFacade, 'query'> & {
  query: { id: string | undefined; rule_id: string | undefined };
};

export interface QueryBulkRequest extends RequestFacade {
  payload: Array<QueryRequest['query']>;
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

export interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

export type UpdateRuleParams = Partial<RuleAlertParams> & {
  id: string | undefined | null;
} & Clients;

export type DeleteRuleParams = Clients & {
  id: string | undefined;
  ruleId: string | undefined | null;
};

export type RuleParams = RuleAlertParams & Clients;

export interface ReadRuleParams {
  alertsClient: AlertsClient;
  id?: string | undefined | null;
  ruleId?: string | undefined | null;
}

export const isAlertTypes = (obj: unknown[]): obj is RuleAlertType[] => {
  return obj.every(rule => isAlertType(rule));
};

export const isAlertType = (obj: unknown): obj is RuleAlertType => {
  return get('alertTypeId', obj) === SIGNALS_ID;
};

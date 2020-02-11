/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { Readable } from 'stream';

import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsFindResponse,
  SavedObjectsClientContract,
} from 'kibana/server';
import { SIGNALS_ID } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting/server';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { RuleAlertParams, RuleTypeParams, RuleAlertParamsRest } from '../types';
import { RequestFacade } from '../../../types';
import { Alert } from '../../../../../alerting/server/types';

export type PatchRuleAlertParamsRest = Partial<RuleAlertParamsRest> & {
  id: string | undefined;
  rule_id: RuleAlertParams['ruleId'] | undefined;
};

export type UpdateRuleAlertParamsRest = RuleAlertParamsRest & {
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

export interface PatchRulesRequest extends RequestFacade {
  payload: PatchRuleAlertParamsRest;
}

export interface BulkPatchRulesRequest extends RequestFacade {
  payload: PatchRuleAlertParamsRest[];
}

export interface UpdateRulesRequest extends RequestFacade {
  payload: UpdateRuleAlertParamsRest;
}

export interface BulkUpdateRulesRequest extends RequestFacade {
  payload: UpdateRuleAlertParamsRest[];
}

export interface RuleAlertType extends Alert {
  params: RuleTypeParams;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleStatusAttributes extends Record<string, any> {
  alertId: string; // created alert id.
  statusDate: string;
  lastFailureAt: string | null | undefined;
  lastFailureMessage: string | null | undefined;
  lastSuccessAt: string | null | undefined;
  lastSuccessMessage: string | null | undefined;
  status: RuleStatusString | null | undefined;
}

export interface RuleStatusResponse {
  [key: string]: {
    current_status: IRuleStatusAttributes | null | undefined;
    failures: IRuleStatusAttributes[] | null | undefined;
  };
}

export interface IRuleSavedAttributesSavedObjectAttributes
  extends IRuleStatusAttributes,
    SavedObjectAttributes {}

export interface IRuleStatusSavedObject {
  type: string;
  id: string;
  attributes: Array<SavedObject<IRuleStatusAttributes & SavedObjectAttributes>>;
  references: unknown[];
  updated_at: string;
  version: string;
}

export interface IRuleStatusFindType {
  page: number;
  per_page: number;
  total: number;
  saved_objects: IRuleStatusSavedObject[];
}

export type RuleStatusString = 'succeeded' | 'failed' | 'going to run' | 'executing';

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
export interface ImportRulesRequest extends Omit<RequestFacade, 'query'> {
  query: { overwrite: boolean };
  payload: { file: HapiReadableStream };
}

export interface ExportRulesRequest extends Omit<RequestFacade, 'query'> {
  payload: { objects: Array<{ rule_id: string }> | null | undefined };
  query: {
    file_name: string;
    exclude_export_details: boolean;
  };
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

export interface FindRulesStatusesRequest extends Omit<RequestFacade, 'query'> {
  query: {
    ids: string[];
  };
}

export interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

export type PatchRuleParams = Partial<RuleAlertParams> & {
  id: string | undefined | null;
  savedObjectsClient: SavedObjectsClientContract;
} & Clients;

export type UpdateRuleParams = RuleAlertParams & {
  id: string | undefined | null;
  savedObjectsClient: SavedObjectsClientContract;
} & Clients;

export type DeleteRuleParams = Clients & {
  id: string | undefined;
  ruleId: string | undefined | null;
};

export type CreateRuleParams = Omit<RuleAlertParams, 'ruleId'> & { ruleId: string } & Clients;

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

export const isRuleStatusAttributes = (obj: unknown): obj is IRuleStatusAttributes => {
  return get('lastSuccessMessage', obj) != null;
};

export const isRuleStatusSavedObjectType = (
  obj: unknown
): obj is SavedObject<IRuleSavedAttributesSavedObjectAttributes> => {
  return get('attributes', obj) != null;
};

export const isRuleStatusFindType = (
  obj: unknown
): obj is SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes> => {
  return get('saved_objects', obj) != null;
};

export const isRuleStatusFindTypes = (
  obj: unknown[] | undefined
): obj is Array<SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>> => {
  return obj ? obj.every(ruleStatus => isRuleStatusFindType(ruleStatus)) : false;
};

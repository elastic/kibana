/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { ActionResult } from '../../../../../../actions/server/types';
import { SignalsStatusRestParams, SignalsQueryRestParams } from '../../signals/types';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '../../../../../common/constants';
import { RuleAlertType } from '../../rules/types';
import { RuleAlertParamsRest } from '../../types';

// The Omit of filter is because of a Hapi Server Typing issue that I am unclear
// where it comes from. I would hope to remove the "filter" as an omit at some point
// when we upgrade and Hapi Server is ok with the filter.
export const typicalPayload = (): Partial<Omit<RuleAlertParamsRest, 'filter'>> => ({
  rule_id: 'rule-1',
  description: 'Detecting root and admin users',
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  interval: '5m',
  name: 'Detect Root/Admin Users',
  output_index: '.siem-signals',
  risk_score: 50,
  type: 'query',
  from: 'now-6m',
  to: 'now',
  severity: 'high',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  threats: [
    {
      framework: 'fake',
      tactic: { id: 'fakeId', name: 'fakeName', reference: 'fakeRef' },
      techniques: [{ id: 'techniqueId', name: 'techniqueName', reference: 'techniqueRef' }],
    },
  ],
});

export const typicalSetStatusSignalByIdsPayload = (): Partial<SignalsStatusRestParams> => ({
  signal_ids: ['somefakeid1', 'somefakeid2'],
  status: 'closed',
});

export const typicalSetStatusSignalByQueryPayload = (): Partial<SignalsStatusRestParams> => ({
  query: { range: { '@timestamp': { gte: 'now-2M', lte: 'now/M' } } },
  status: 'closed',
});

export const typicalSignalsQuery = (): Partial<SignalsQueryRestParams> => ({
  query: { match_all: {} },
});

export const typicalSignalsQueryAggs = (): Partial<SignalsQueryRestParams> => ({
  aggs: { statuses: { terms: { field: 'signal.status', size: 10 } } },
});

export const setStatusSignalMissingIdsAndQueryPayload = (): Partial<SignalsStatusRestParams> => ({
  status: 'closed',
});

export const getUpdateRequest = (): ServerInjectOptions => ({
  method: 'PUT',
  url: DETECTION_ENGINE_RULES_URL,
  payload: {
    ...typicalPayload(),
  },
});

export const getReadRequest = (): ServerInjectOptions => ({
  method: 'GET',
  url: `${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`,
});

export const getFindRequest = (): ServerInjectOptions => ({
  method: 'GET',
  url: `${DETECTION_ENGINE_RULES_URL}/_find`,
});

interface FindHit {
  page: number;
  perPage: number;
  total: number;
  data: RuleAlertType[];
}

export const getFindResult = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: [],
});

export const getFindResultWithSingleHit = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: [getResult()],
});

export const getFindResultWithMultiHits = (data: RuleAlertType[]): FindHit => ({
  page: 1,
  perPage: 1,
  total: 2,
  data,
});

export const getDeleteRequest = (): ServerInjectOptions => ({
  method: 'DELETE',
  url: `${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`,
});

export const getDeleteRequestById = (): ServerInjectOptions => ({
  method: 'DELETE',
  url: `${DETECTION_ENGINE_RULES_URL}?id=04128c15-0d1b-4716-a4c5-46997ac7f3bd`,
});

export const getCreateRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: DETECTION_ENGINE_RULES_URL,
  payload: {
    ...typicalPayload(),
  },
});

export const getSetSignalStatusByIdsRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
  payload: {
    ...typicalSetStatusSignalByIdsPayload(),
  },
});

export const getSetSignalStatusByQueryRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
  payload: {
    ...typicalSetStatusSignalByQueryPayload(),
  },
});

export const getSignalsQueryRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
  payload: { ...typicalSignalsQuery() },
});

export const getSignalsAggsQueryRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
  payload: { ...typicalSignalsQueryAggs() },
});

export const createActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  name: '',
  config: {},
});

export const getResult = (): RuleAlertType => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [],
  alertTypeId: 'siem.signals',
  params: {
    description: 'Detecting root and admin users',
    ruleId: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    falsePositives: [],
    from: 'now-6m',
    filter: null,
    immutable: false,
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    outputIndex: '.siem-signals',
    savedId: null,
    meta: null,
    filters: null,
    riskScore: 50,
    maxSignals: 100,
    size: 1,
    severity: 'high',
    tags: [],
    to: 'now',
    type: 'query',
    threats: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0040',
          name: 'impact',
          reference: 'https://attack.mitre.org/tactics/TA0040/',
        },
        techniques: [
          {
            id: 'T1499',
            name: 'endpoint denial of service',
            reference: 'https://attack.mitre.org/techniques/T1499/',
          },
        ],
      },
    ],
    references: ['http://www.example.com', 'https://ww.example.com'],
  },
  interval: '5m',
  enabled: true,
  actions: [],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '2dabe330-0702-11ea-8b50-773b89126888',
});

export const updateActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  name: '',
  config: {},
});

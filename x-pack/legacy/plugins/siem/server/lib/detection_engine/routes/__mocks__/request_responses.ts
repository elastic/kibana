/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { ActionResult } from '../../../../../../actions/server/types';
import { SignalAlertParamsRest, SignalAlertType } from '../../alerts/types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

// The Omit of filter is because of a Hapi Server Typing issue that I am unclear
// where it comes from. I would hope to remove the "filter" as an omit at some point
// when we upgrade and Hapi Server is ok with the filter.
export const typicalPayload = (): Partial<Omit<SignalAlertParamsRest, 'filter'>> => ({
  rule_id: 'rule-1',
  description: 'Detecting root and admin users',
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  interval: '5m',
  name: 'Detect Root/Admin Users',
  type: 'query',
  from: 'now-6m',
  to: 'now',
  severity: 'high',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
});

export const typicalFilterPayload = (): Partial<SignalAlertParamsRest> => ({
  rule_id: 'rule-1',
  description: 'Detecting root and admin users',
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  interval: '5m',
  name: 'Detect Root/Admin Users',
  type: 'filter',
  from: 'now-6m',
  to: 'now',
  severity: 'high',
  filter: {},
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
  data: SignalAlertType[];
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

export const getFindResultWithMultiHits = (data: SignalAlertType[]): FindHit => ({
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

export const createActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  description: '',
  config: {},
});

export const getResult = (): SignalAlertType => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [],
  alertTypeId: 'siem.signals',
  alertTypeParams: {
    description: 'Detecting root and admin users',
    ruleId: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    falsePositives: [],
    from: 'now-6m',
    filter: undefined,
    immutable: false,
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    savedId: undefined,
    filters: undefined,
    maxSignals: 100,
    size: 1,
    severity: 'high',
    tags: [],
    to: 'now',
    type: 'query',
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
  description: '',
  config: {},
});

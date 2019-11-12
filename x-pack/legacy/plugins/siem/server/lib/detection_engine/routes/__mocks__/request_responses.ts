/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { ActionResult } from '../../../../../../actions/server/types';
import { SignalAlertParamsRest } from '../../alerts/types';

// The Omit of filter is because of a Hapi Server Typing issue that I am unclear
// where it comes from. I would hope to remove the "filter" as an omit at some point
// when we upgrade and Hapi Server is ok with the filter.
export const typicalPayload = (): Partial<Omit<SignalAlertParamsRest, 'filter'>> => ({
  id: 'rule-1',
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

export const getUpdateRequest = (): ServerInjectOptions => ({
  method: 'PUT',
  url: '/api/siem/signals',
  payload: {
    ...typicalPayload(),
  },
});

export const getReadRequest = (): ServerInjectOptions => ({
  method: 'GET',
  url: '/api/siem/signals/rule-1',
});

export const getFindRequest = (): ServerInjectOptions => ({
  method: 'GET',
  url: '/api/siem/signals/_find',
});

export const getFindResult = () => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: [],
});

export const getDeleteRequest = (): ServerInjectOptions => ({
  method: 'DELETE',
  url: '/api/siem/signals/rule-1',
});

export const getCreateRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: '/api/siem/signals',
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

export const createAlertResult = () => ({
  id: 'rule-1',
  alertTypeId: 'siem.signals',
  alertTypeParams: {
    description: 'Detecting root and admin users',
    id: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    from: 'now-6m',
    filter: null,
    query: 'user.name: root or user.name: admin',
    maxSignals: 100,
    name: 'Detect Root/Admin Users',
    severity: 'high',
    to: 'now',
    type: 'query',
    language: 'kuery',
    references: [],
  },
  interval: '5m',
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'SIEM Alert Fired',
        level: 'info',
      },
      id: '9c3846a3-dbf9-40ce-ba7e-ef635499afa6',
    },
  ],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '78d036d0-f042-11e9-a9ae-51b9a11630ec',
});

export const getResult = () => ({
  id: 'result-1',
  enabled: false,
  alertTypeId: '',
  interval: undefined,
  actions: undefined,
  alertTypeParams: undefined,
});

export const updateActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  description: '',
  config: {},
});

export const updateAlertResult = () => ({
  id: 'rule-1',
  alertTypeId: 'siem.signals',
  alertTypeParams: {
    description: 'Detecting root and admin users',
    id: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    from: 'now-6m',
    filter: null,
    query: 'user.name: root or user.name: admin',
    maxSignals: 100,
    name: 'Detect Root/Admin Users',
    severity: 'high',
    to: 'now',
    type: 'query',
    language: 'kuery',
    references: [],
  },
  interval: '5m',
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'SIEM Alert Fired',
        level: 'info',
      },
      id: '9c3846a3-dbf9-40ce-ba7e-ef635499afa6',
    },
  ],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '78d036d0-f042-11e9-a9ae-51b9a11630ec',
});

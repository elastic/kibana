/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { SavedObjectsFindResponse } from 'kibana/server';
import { ActionResult } from '../../../../../../actions/server/types';
import { SignalsStatusRestParams, SignalsQueryRestParams } from '../../signals/types';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  INTERNAL_RULE_ID_KEY,
  INTERNAL_IMMUTABLE_KEY,
  DETECTION_ENGINE_PREPACKAGED_URL,
} from '../../../../../common/constants';
import { RuleAlertType, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { RuleAlertParamsRest, PrepackagedRules } from '../../types';
import { TEST_BOUNDARY } from './utils';

export const mockPrepackagedRule = (): PrepackagedRules => ({
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
  threat: [
    {
      framework: 'fake',
      tactic: { id: 'fakeId', name: 'fakeName', reference: 'fakeRef' },
      technique: [{ id: 'techniqueId', name: 'techniqueName', reference: 'techniqueRef' }],
    },
  ],
  enabled: true,
  filters: [],
  immutable: false,
  references: [],
  meta: {},
  tags: [],
  version: 1,
  false_positives: [],
  saved_id: 'some-id',
  max_signals: 100,
  timeline_id: 'timeline-id',
  timeline_title: 'timeline-title',
});

export const typicalPayload = (): Partial<RuleAlertParamsRest> => ({
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
  threat: [
    {
      framework: 'fake',
      tactic: { id: 'fakeId', name: 'fakeName', reference: 'fakeRef' },
      technique: [{ id: 'techniqueId', name: 'techniqueName', reference: 'techniqueRef' }],
    },
  ],
});

export const typicalSetStatusSignalByIdsPayload = (): Partial<SignalsStatusRestParams> => ({
  signal_ids: ['somefakeid1', 'somefakeid2'],
  status: 'closed',
});

export const typicalSetStatusSignalByQueryPayload = (): Partial<SignalsStatusRestParams> => ({
  query: { bool: { filter: { range: { '@timestamp': { gte: 'now-2M', lte: 'now/M' } } } } },
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

export const getPatchRequest = (): ServerInjectOptions => ({
  method: 'PATCH',
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

export const getReadBulkRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
  payload: [typicalPayload()],
});

export const getUpdateBulkRequest = (): ServerInjectOptions => ({
  method: 'PUT',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
  payload: [typicalPayload()],
});

export const getPatchBulkRequest = (): ServerInjectOptions => ({
  method: 'PATCH',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
  payload: [typicalPayload()],
});

export const getDeleteBulkRequest = (): ServerInjectOptions => ({
  method: 'DELETE',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
  payload: [{ rule_id: 'rule-1' }],
});

export const getDeleteBulkRequestById = (): ServerInjectOptions => ({
  method: 'DELETE',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
  payload: [{ id: 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
});

export const getDeleteAsPostBulkRequestById = (): ServerInjectOptions => ({
  method: 'POST',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
  payload: [{ id: 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
});

export const getDeleteAsPostBulkRequest = (): ServerInjectOptions => ({
  method: 'POST',
  url: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
  payload: [{ rule_id: 'rule-1' }],
});

export const getPrivilegeRequest = (): ServerInjectOptions => ({
  method: 'GET',
  url: DETECTION_ENGINE_PRIVILEGES_URL,
});

export const addPrepackagedRulesRequest = (): ServerInjectOptions => ({
  method: 'PUT',
  url: DETECTION_ENGINE_PREPACKAGED_URL,
});

export const getPrepackagedRulesStatusRequest = (): ServerInjectOptions => ({
  method: 'GET',
  url: `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`,
});

export interface FindHit {
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
  total: 1,
  data: [getResult()],
});

export const getFindResultWithMultiHits = ({
  data,
  page = 1,
  perPage = 1,
  total,
}: {
  data: RuleAlertType[];
  page?: number;
  perPage?: number;
  total?: number;
}) => {
  return {
    page,
    perPage,
    total: total != null ? total : data.length,
    data,
  };
};

export const getImportRulesRequest = (payload?: Buffer): ServerInjectOptions => ({
  method: 'POST',
  url: `${DETECTION_ENGINE_RULES_URL}/_import`,
  headers: {
    'Content-Type': `multipart/form-data; boundary=${TEST_BOUNDARY}`,
  },
  payload,
});

export const getImportRulesRequestOverwriteTrue = (payload?: Buffer): ServerInjectOptions => ({
  method: 'POST',
  url: `${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`,
  headers: {
    'Content-Type': `multipart/form-data; boundary=${TEST_BOUNDARY}`,
  },
  payload,
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
  tags: [`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:false`],
  alertTypeId: 'siem.signals',
  consumer: 'siem',
  params: {
    description: 'Detecting root and admin users',
    ruleId: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    falsePositives: [],
    from: 'now-6m',
    immutable: false,
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    outputIndex: '.siem-signals',
    savedId: 'some-id',
    timelineId: 'some-timeline-id',
    timelineTitle: 'some-timeline-title',
    meta: { someMeta: 'someField' },
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    riskScore: 50,
    maxSignals: 100,
    severity: 'high',
    to: 'now',
    type: 'query',
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0040',
          name: 'impact',
          reference: 'https://attack.mitre.org/tactics/TA0040/',
        },
        technique: [
          {
            id: 'T1499',
            name: 'endpoint denial of service',
            reference: 'https://attack.mitre.org/techniques/T1499/',
          },
        ],
      },
    ],
    references: ['http://www.example.com', 'https://ww.example.com'],
    version: 1,
  },
  createdAt: new Date('2019-12-13T16:40:33.400Z'),
  updatedAt: new Date('2019-12-13T16:40:33.400Z'),
  schedule: { interval: '5m' },
  enabled: true,
  actions: [],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKey: null,
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

export const getMockPrivileges = () => ({
  username: 'test-space',
  has_all_requested: false,
  cluster: {
    monitor_ml: true,
    manage_ccr: false,
    manage_index_templates: true,
    monitor_watcher: true,
    monitor_transform: true,
    read_ilm: true,
    manage_api_key: false,
    manage_security: false,
    manage_own_api_key: false,
    manage_saml: false,
    all: false,
    manage_ilm: true,
    manage_ingest_pipelines: true,
    read_ccr: false,
    manage_rollup: true,
    monitor: true,
    manage_watcher: true,
    manage: true,
    manage_transform: true,
    manage_token: false,
    manage_ml: true,
    manage_pipeline: true,
    monitor_rollup: true,
    transport_client: true,
    create_snapshot: true,
  },
  index: {
    '.siem-signals-test-space': {
      all: false,
      manage_ilm: true,
      read: false,
      create_index: true,
      read_cross_cluster: false,
      index: false,
      monitor: true,
      delete: false,
      manage: true,
      delete_index: true,
      create_doc: false,
      view_index_metadata: true,
      create: false,
      manage_follow_index: true,
      manage_leader_index: true,
      write: false,
    },
  },
  application: {},
  is_authenticated: false,
  has_encryption_key: true,
});

export const getFindResultStatus = (): SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes> => ({
  page: 1,
  per_page: 1,
  total: 0,
  saved_objects: [],
});

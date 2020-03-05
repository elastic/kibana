/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import { ActionResult } from '../../../../../../../../plugins/actions/server';
import {
  SignalsStatusRestParams,
  SignalsQueryRestParams,
  SignalSearchResponse,
} from '../../signals/types';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  INTERNAL_RULE_ID_KEY,
  INTERNAL_IMMUTABLE_KEY,
  DETECTION_ENGINE_PREPACKAGED_URL,
} from '../../../../../common/constants';
import { ShardsResponse } from '../../../types';
import {
  RuleAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  HapiReadableStream,
} from '../../rules/types';
import { RuleAlertParamsRest, PrepackagedRules } from '../../types';
import { requestMock } from './request';

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

export const getUpdateRequest = () =>
  requestMock.create({
    method: 'put',
    path: DETECTION_ENGINE_RULES_URL,
    body: typicalPayload(),
  });

export const getPatchRequest = () =>
  requestMock.create({
    method: 'patch',
    path: DETECTION_ENGINE_RULES_URL,
    body: typicalPayload(),
  });

export const getReadRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_RULES_URL,
    query: { rule_id: 'rule-1' },
  });

export const getFindRequest = () =>
  requestMock.create({
    method: 'get',
    path: `${DETECTION_ENGINE_RULES_URL}/_find`,
  });

export const getReadBulkRequest = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
    body: [typicalPayload()],
  });

export const getUpdateBulkRequest = () =>
  requestMock.create({
    method: 'put',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    body: [typicalPayload()],
  });

export const getPatchBulkRequest = () =>
  requestMock.create({
    method: 'patch',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    body: [typicalPayload()],
  });

export const getDeleteBulkRequest = () =>
  requestMock.create({
    method: 'delete',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ rule_id: 'rule-1' }],
  });

export const getDeleteBulkRequestById = () =>
  requestMock.create({
    method: 'delete',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ id: 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
  });

export const getDeleteAsPostBulkRequestById = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ id: 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
  });

export const getDeleteAsPostBulkRequest = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ rule_id: 'rule-1' }],
  });

export const getPrivilegeRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_PRIVILEGES_URL,
  });

export const addPrepackagedRulesRequest = () =>
  requestMock.create({
    method: 'put',
    path: DETECTION_ENGINE_PREPACKAGED_URL,
  });

export const getPrepackagedRulesStatusRequest = () =>
  requestMock.create({
    method: 'get',
    path: `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`,
  });

export interface FindHit {
  page: number;
  perPage: number;
  total: number;
  data: RuleAlertType[];
}

export const getEmptyFindResult = (): FindHit => ({
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

export const nonRuleFindResult = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [nonRuleAlert()],
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

export const ruleStatusRequest = () =>
  requestMock.create({
    method: 'get',
    path: `${DETECTION_ENGINE_RULES_URL}/_find_statuses`,
    query: { ids: ['someId'] },
  });

export const getImportRulesRequest = (hapiStream?: HapiReadableStream) =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_import`,
    body: { file: hapiStream },
  });

export const getImportRulesRequestOverwriteTrue = (hapiStream?: HapiReadableStream) =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_import`,
    body: { file: hapiStream },
    query: { overwrite: true },
  });

export const getDeleteRequest = () =>
  requestMock.create({
    method: 'delete',
    path: DETECTION_ENGINE_RULES_URL,
    query: { rule_id: 'rule-1' },
  });

export const getDeleteRequestById = () =>
  requestMock.create({
    method: 'delete',
    path: DETECTION_ENGINE_RULES_URL,
    query: { id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' },
  });

export const getCreateRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_URL,
    body: typicalPayload(),
  });

export const getSetSignalStatusByIdsRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
    body: typicalSetStatusSignalByIdsPayload(),
  });

export const getSetSignalStatusByQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
    body: typicalSetStatusSignalByQueryPayload(),
  });

export const getSignalsQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    body: typicalSignalsQuery(),
  });

export const getSignalsAggsQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    body: typicalSignalsQueryAggs(),
  });

export const getSignalsAggsAndQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    body: { ...typicalSignalsQuery(), ...typicalSignalsQueryAggs() },
  });

export const createActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  name: '',
  config: {},
});

export const nonRuleAlert = () => ({
  ...getResult(),
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bc',
  name: 'Non-Rule Alert',
  alertTypeId: 'something',
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

export const getFindResultStatusEmpty = (): SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes> => ({
  page: 1,
  per_page: 1,
  total: 0,
  saved_objects: [],
});

export const getFindResultStatus = (): SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes> => ({
  page: 1,
  per_page: 6,
  total: 2,
  saved_objects: [
    {
      type: 'my-type',
      id: 'e0b86950-4e9f-11ea-bdbd-07b56aa159b3',
      attributes: {
        alertId: '1ea5a820-4da1-4e82-92a1-2b43a7bece08',
        statusDate: '2020-02-18T15:26:49.783Z',
        status: 'succeeded',
        lastFailureAt: null,
        lastSuccessAt: '2020-02-18T15:26:49.783Z',
        lastFailureMessage: null,
        lastSuccessMessage: 'succeeded',
      },
      references: [],
      updated_at: '2020-02-18T15:26:51.333Z',
      version: 'WzQ2LDFd',
    },
    {
      type: 'my-type',
      id: '91246bd0-5261-11ea-9650-33b954270f67',
      attributes: {
        alertId: '1ea5a820-4da1-4e82-92a1-2b43a7bece08',
        statusDate: '2020-02-18T15:15:58.806Z',
        status: 'failed',
        lastFailureAt: '2020-02-18T15:15:58.806Z',
        lastSuccessAt: '2020-02-13T20:31:59.855Z',
        lastFailureMessage:
          'Signal rule name: "Query with a rule id Number 1", id: "1ea5a820-4da1-4e82-92a1-2b43a7bece08", rule_id: "query-rule-id-1" has a time gap of 5 days (412682928ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.',
        lastSuccessMessage: 'succeeded',
      },
      references: [],
      updated_at: '2020-02-18T15:15:58.860Z',
      version: 'WzMyLDFd',
    },
  ],
});

export const getEmptySignalsResponse = (): SignalSearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
  aggregations: {
    signalsByGrouping: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
  },
});

export const getSuccessfulSignalUpdateResponse = () => ({
  took: 18,
  timed_out: false,
  total: 1,
  updated: 1,
  deleted: 0,
  batches: 1,
  version_conflicts: 0,
  noops: 0,
  retries: { bulk: 0, search: 0 },
  throttled_millis: 0,
  requests_per_second: -1,
  throttled_until_millis: 0,
  failures: [],
});

export const getIndexName = () => 'index-name';
export const getEmptyIndex = (): { _shards: Partial<ShardsResponse> } => ({
  _shards: { total: 0 },
});
export const getNonEmptyIndex = (): { _shards: Partial<ShardsResponse> } => ({
  _shards: { total: 1 },
});

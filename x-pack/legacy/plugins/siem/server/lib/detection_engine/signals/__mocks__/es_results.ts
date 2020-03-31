/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, SignalSearchResponse } from '../types';
import {
  Logger,
  SavedObject,
  SavedObjectsFindResponse,
} from '../../../../../../../../../src/core/server';
import { loggingServiceMock } from '../../../../../../../../../src/core/server/mocks';
import { RuleTypeParams, OutputRuleAlertRest } from '../../types';
import { IRuleStatusAttributes } from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../../../saved_objects';

export const sampleRuleAlertParams = (
  maxSignals?: number | undefined,
  riskScore?: number | undefined
): RuleTypeParams => ({
  ruleId: 'rule-1',
  description: 'Detecting root and admin users',
  falsePositives: [],
  immutable: false,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  type: 'query',
  from: 'now-6m',
  to: 'now',
  severity: 'high',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  outputIndex: '.siem-signals',
  references: ['http://google.com'],
  riskScore: riskScore ? riskScore : 50,
  maxSignals: maxSignals ? maxSignals : 10000,
  note: '',
  anomalyThreshold: undefined,
  machineLearningJobId: undefined,
  filters: undefined,
  savedId: undefined,
  timelineId: undefined,
  timelineTitle: undefined,
  meta: undefined,
  threat: undefined,
  version: 1,
  lists: [
    {
      field: 'source.ip',
      boolean_operator: 'and',
      values: [
        {
          name: '127.0.0.1',
          type: 'value',
        },
      ],
    },
    {
      field: 'host.name',
      boolean_operator: 'and not',
      values: [
        {
          name: 'rock01',
          type: 'value',
        },
        {
          name: 'mothra',
          type: 'value',
        },
      ],
    },
  ],
});

export const sampleDocNoSortId = (someUuid: string = sampleIdGuid): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
});

export const sampleDocNoSortIdNoVersion = (someUuid: string = sampleIdGuid): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
});

export const sampleDocWithSortId = (someUuid: string = sampleIdGuid): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
  sort: ['1234567891111'],
});

export const sampleEmptyDocSearchResults = (): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 0,
    max_score: 100,
    hits: [],
  },
});

export const sampleDocWithAncestors = (): SignalSearchResponse => {
  const sampleDoc = sampleDocNoSortId();
  sampleDoc._source.signal = {
    parent: {
      rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'event',
      index: 'myFakeSignalIndex',
      depth: 1,
    },
    ancestors: [
      {
        rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
    ],
  };

  return {
    took: 10,
    timed_out: false,
    _shards: {
      total: 10,
      successful: 10,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 100,
      hits: [sampleDoc],
    },
  };
};

export const sampleBulkCreateDuplicateResult = {
  took: 60,
  errors: true,
  items: [
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        _version: 1,
        result: 'created',
        _shards: {
          total: 2,
          successful: 1,
          failed: 0,
        },
        _seq_no: 1,
        _primary_term: 1,
        status: 201,
      },
    },
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: '[4]: version conflict, document already exists (current version [1])',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: '[4]: version conflict, document already exists (current version [1])',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
  ],
};

export const sampleBulkCreateErrorResult = {
  ...sampleBulkCreateDuplicateResult,
  items: [
    ...sampleBulkCreateDuplicateResult.items,
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '5',
        status: 500,
        error: {
          type: 'internal_server_error',
          reason: '[4]: internal server error',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
  ],
};

export const sampleDocSearchResultsNoSortId = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortId(someUuid),
      },
    ],
  },
});

export const sampleDocSearchResultsNoSortIdNoVersion = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortIdNoVersion(someUuid),
      },
    ],
  },
});

export const sampleDocSearchResultsNoSortIdNoHits = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 0,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortId(someUuid),
      },
    ],
  },
});

export const repeatedSearchResultsWithSortId = (
  total: number,
  pageSize: number,
  guids: string[]
) => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total,
    max_score: 100,
    hits: Array.from({ length: pageSize }).map((x, index) => ({
      ...sampleDocWithSortId(guids[index]),
    })),
  },
});

export const sampleDocSearchResultsWithSortId = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 1,
    max_score: 100,
    hits: [
      {
        ...sampleDocWithSortId(someUuid),
      },
    ],
  },
});

export const sampleRuleGuid = '04128c15-0d1b-4716-a4c5-46997ac7f3bd';
export const sampleIdGuid = 'e1e08ddc-5e37-49ff-a258-5393aa44435a';

export const sampleRule = (): Partial<OutputRuleAlertRest> => {
  return {
    created_by: 'elastic',
    description: 'Detecting root and admin users',
    enabled: true,
    false_positives: [],
    from: 'now-6m',
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    immutable: false,
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    interval: '5m',
    risk_score: 50,
    rule_id: 'rule-1',
    language: 'kuery',
    max_signals: 100,
    name: 'Detect Root/Admin Users',
    output_index: '.siem-signals',
    query: 'user.name: root or user.name: admin',
    references: ['http://www.example.com', 'https://ww.example.com'],
    severity: 'high',
    updated_by: 'elastic',
    tags: ['some fake tag 1', 'some fake tag 2'],
    to: 'now',
    type: 'query',
    note: '',
  };
};

export const exampleRuleStatus: () => SavedObject<IRuleStatusAttributes> = () => ({
  type: ruleStatusSavedObjectType,
  id: '042e6d90-7069-11ea-af8b-0f8ae4fa817e',
  attributes: {
    alertId: 'f4b8e31d-cf93-4bde-a265-298bde885cd7',
    statusDate: '2020-03-27T22:55:59.517Z',
    status: 'succeeded',
    lastFailureAt: null,
    lastSuccessAt: '2020-03-27T22:55:59.517Z',
    lastFailureMessage: null,
    lastSuccessMessage: 'succeeded',
    gap: null,
    bulkCreateTimeDurations: [],
    searchAfterTimeDurations: [],
    lastLookBackDate: null,
  },
  references: [],
  updated_at: '2020-03-27T22:55:59.577Z',
  version: 'WzgyMiwxXQ==',
});

export const exampleFindRuleStatusResponse: (
  mockStatuses: Array<SavedObject<IRuleStatusAttributes>>
) => SavedObjectsFindResponse<IRuleStatusAttributes> = (mockStatuses = [exampleRuleStatus()]) => ({
  total: 1,
  per_page: 6,
  page: 1,
  saved_objects: mockStatuses,
});

export const mockLogger: Logger = loggingServiceMock.createLogger();

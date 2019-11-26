/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, SignalSearchResponse, RuleTypeParams } from '../types';

export const sampleRuleAlertParams = (
  maxSignals: number | undefined,
  riskScore?: number | undefined
): RuleTypeParams => ({
  ruleId: 'rule-1',
  description: 'Detecting root and admin users',
  falsePositives: [],
  immutable: false,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  type: 'query',
  from: 'now-6m',
  tags: ['some fake tag'],
  to: 'now',
  severity: 'high',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  outputIndex: '.siem-signals',
  references: ['http://google.com'],
  riskScore: riskScore ? riskScore : 50,
  maxSignals: maxSignals ? maxSignals : 10000,
  filter: undefined,
  filters: undefined,
  savedId: undefined,
  meta: undefined,
});

export const sampleDocNoSortId = (someUuid: string): SignalSourceHit => ({
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

export const sampleDocNoSortIdNoVersion = (someUuid: string): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
});

export const sampleDocWithSortId = (someUuid: string): SignalSourceHit => ({
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

export const sampleEmptyDocSearchResults: SignalSearchResponse = {
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

export const sampleDocSearchResultsNoSortId = (someUuid: string): SignalSearchResponse => ({
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
  someUuid: string
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

export const sampleDocSearchResultsNoSortIdNoHits = (someUuid: string): SignalSearchResponse => ({
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

export const sampleDocSearchResultsWithSortId = (someUuid: string): SignalSearchResponse => ({
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

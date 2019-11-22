/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, SignalSearchResponse, AlertTypeParams } from '../types';
import uuid from 'uuid';

export const sampleSignalAlertParams = (
  maxSignals: number | undefined,
  riskScore?: number | undefined
): AlertTypeParams => ({
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

export const sampleDocNoSortId: SignalSourceHit = {
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: uuid.v4(),
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
};

export const sampleDocNoSortIdNoVersion: SignalSourceHit = {
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _id: uuid.v4(),
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
};

export const sampleDocWithSortId: SignalSourceHit = {
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: uuid.v4(),
  _source: {
    someKey: 'someValue',
    '@timestamp': 'someTimeStamp',
  },
  sort: ['1234567891111'],
};

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

export const sampleDocSearchResultsNoSortId: SignalSearchResponse = {
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
        ...sampleDocNoSortId,
      },
    ],
  },
};

export const sampleDocSearchResultsNoSortIdNoVersion: SignalSearchResponse = {
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
        ...sampleDocNoSortIdNoVersion,
      },
    ],
  },
};

export const sampleDocSearchResultsNoSortIdNoHits: SignalSearchResponse = {
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
        ...sampleDocNoSortId,
      },
    ],
  },
};

export const repeatedSearchResultsWithSortId = (total: number, pageSize: number) => ({
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
    hits: Array.from({ length: pageSize }).map(x => ({
      ...sampleDocWithSortId,
    })),
  },
});

export const sampleDocSearchResultsWithSortId: SignalSearchResponse = {
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
        ...sampleDocWithSortId,
      },
    ],
  },
};

export const sampleSignalId = '04128c15-0d1b-4716-a4c5-46997ac7f3bd';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, SignalSearchResponse, SignalAlertParams } from '../types';

export const sampleSignalAlertParams = (maxSignals: number | undefined): SignalAlertParams => ({
  ruleId: 'rule-1',
  description: 'Detecting root and admin users',
  falsePositives: [],
  immutable: false,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  interval: '5m',
  name: 'Detect Root/Admin Users',
  type: 'query',
  from: 'now-6m',
  tags: ['some fake tag'],
  to: 'now',
  severity: 'high',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  references: ['http://google.com'],
  maxSignals: maxSignals ? maxSignals : 10000,
  enabled: true,
  filter: undefined,
  filters: undefined,
  savedId: undefined,
  size: 1000,
});

export const sampleDocNoSortId: SignalSourceHit = {
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: 'someFakeId',
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
  _id: 'someFakeId',
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

export const repeatedSearchResultsWithSortId = (repeat: number) => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: repeat,
    max_score: 100,
    hits: Array.from({ length: repeat }).map(x => ({
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

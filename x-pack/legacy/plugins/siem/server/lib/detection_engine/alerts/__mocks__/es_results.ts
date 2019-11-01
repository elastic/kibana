/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, SignalSearchResponse, SignalAlertParams, BulkResponse } from '../types';

export const sampleSignalAlertParams = (): SignalAlertParams => ({
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
  references: ['http://google.com'],
  maxSignals: 100,
  enabled: true,
  filter: undefined,
  filters: undefined,
  savedId: undefined,
  size: undefined,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDiscoverEsqlQuery,
  getIndexManagementLocatorParams,
  getKiDisplayTitle,
  getStatusesForFilter,
  getListKiStatusFilterLabel,
} from './list_ki_helpers';

describe('getDiscoverEsqlQuery', () => {
  it('builds a FROM query with limit', () => {
    expect(getDiscoverEsqlQuery('ai-index-idx-sample')).toBe(
      'FROM ai-index-idx-sample | LIMIT 100'
    );
  });
});

describe('getIndexManagementLocatorParams', () => {
  it('maps data streams to data stream details', () => {
    expect(
      getIndexManagementLocatorParams({ type: 'data_stream', value: 'logs-ai-default' })
    ).toEqual({
      page: 'data_streams_details',
      dataStreamName: 'logs-ai-default',
    });
  });

  it('maps indices to index details', () => {
    expect(
      getIndexManagementLocatorParams({ type: 'index', value: 'ai-index-idx-logs-*' })
    ).toEqual({
      page: 'index_details',
      indexName: 'ai-index-idx-logs-*',
    });
  });
});

describe('getKiDisplayTitle', () => {
  it('returns the title when set', () => {
    expect(getKiDisplayTitle('Refund playbook')).toBe('Refund playbook');
  });

  it('returns Untitled when title is missing', () => {
    expect(getKiDisplayTitle()).toBe('Untitled');
    expect(getKiDisplayTitle('')).toBe('Untitled');
  });
});

describe('getStatusesForFilter', () => {
  it('asks for one status', () => {
    expect(getStatusesForFilter('deleted')).toEqual(['deleted']);
  });

  it('asks for every status for All statuses', () => {
    expect(getStatusesForFilter('all')).toEqual([
      'active',
      'deleted',
      'verification_failed',
      'expired',
    ]);
  });
});

describe('getListKiStatusFilterLabel', () => {
  it('labels the prototype status options', () => {
    expect(getListKiStatusFilterLabel('active')).toBe('Active');
    expect(getListKiStatusFilterLabel('expired')).toBe('Expired');
    expect(getListKiStatusFilterLabel('verification_failed')).toBe('Failed');
    expect(getListKiStatusFilterLabel('all')).toBe('All statuses');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_TYPE_FILTER,
  getDiscoverEsqlQuery,
  getIndexManagementLocatorParams,
  getKiDisplayTitle,
  getLifecycleStatusesForFilter,
  getListKiStatusFilterLabel,
  getListKiTypeFilterLabel,
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

describe('getListKiTypeFilterLabel', () => {
  it('returns All for the all filter value', () => {
    expect(getListKiTypeFilterLabel(ALL_TYPE_FILTER.value)).toBe('All');
  });

  it('formats type labels', () => {
    expect(getListKiTypeFilterLabel('playbook')).toBe('playbook');
    expect(getListKiTypeFilterLabel('custom.type')).toBe('custom type');
  });
});

describe('getKiDisplayTitle', () => {
  it('returns the title when set', () => {
    expect(getKiDisplayTitle('Refund playbook')).toBe('Refund playbook');
  });

  it('returns None when title is missing', () => {
    expect(getKiDisplayTitle()).toBe('None');
    expect(getKiDisplayTitle('')).toBe('None');
  });
});

describe('getLifecycleStatusesForFilter', () => {
  it('asks for one status', () => {
    expect(getLifecycleStatusesForFilter('deleted')).toEqual(['deleted']);
  });

  it('asks for every status for All statuses', () => {
    expect(getLifecycleStatusesForFilter('all')).toEqual([
      'active',
      'deleted',
      'verification_failed',
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

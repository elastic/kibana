/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractAgentIdsWithData,
  filterIncomingDataWithData,
  getSortConfig,
  removeSOAttributes,
} from './agent_utils';
import type { IncomingDataList } from '../types/rest_spec/agent';

describe('Agent utils', () => {
  it('should get sort config', () => {
    const sortConfig = getSortConfig('agent.id', 'asc');
    expect(sortConfig).toEqual([{ 'agent.id': { order: 'asc' } }]);
  });

  it('should get default sort config', () => {
    const sortConfig = getSortConfig('enrolled_at', 'desc');
    expect(sortConfig).toEqual([
      { enrolled_at: { order: 'desc' } },
      { 'local_metadata.host.hostname.keyword': { order: 'asc' } },
    ]);
  });

  it('should sort on the hostname keyword sub-field instead of the analyzed text field, ascending', () => {
    const sortConfig = getSortConfig('local_metadata.host.hostname', 'asc');
    expect(sortConfig).toEqual([{ 'local_metadata.host.hostname.keyword': { order: 'asc' } }]);
  });

  it('should sort on the hostname keyword sub-field instead of the analyzed text field, descending', () => {
    const sortConfig = getSortConfig('local_metadata.host.hostname', 'desc');
    expect(sortConfig).toEqual([{ 'local_metadata.host.hostname.keyword': { order: 'desc' } }]);
  });

  it('should remove SO attributes', () => {
    const kuery = 'attributes.test AND fleet-agents.test';
    const result = removeSOAttributes(kuery);
    expect(result).toEqual('test AND test');
  });
});

describe('incoming data helpers', () => {
  const items: IncomingDataList[] = [
    { a1: { data: true } },
    { a2: { data: false } },
    { a3: { data: true } },
  ];

  it('keeps only the items of agents with data', () => {
    expect(filterIncomingDataWithData(items)).toEqual([
      { a1: { data: true } },
      { a3: { data: true } },
    ]);
  });

  it('lists the ids of agents with data', () => {
    expect(extractAgentIdsWithData(items)).toEqual(['a1', 'a3']);
  });

  it('returns nothing for no items or no data', () => {
    expect(extractAgentIdsWithData([])).toEqual([]);
    expect(extractAgentIdsWithData([{ a2: { data: false } }])).toEqual([]);
  });
});

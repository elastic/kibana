/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSortConfig, removeSOAttributes } from './agent_utils';

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

  it('should remove SO attributes', () => {
    const kuery = 'attributes.test AND fleet-agents.test';
    const result = removeSOAttributes(kuery);
    expect(result).toEqual('test AND test');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionDestructiveApis } from './destructive_apis';

describe('partitionDestructiveApis', () => {
  it('drops read-only identifiers and keeps state-changing ones', async () => {
    const { destructive, nonDestructive } = await partitionDestructiveApis([
      { target: 'elasticsearch', api: 'indices.delete' },
      { target: 'elasticsearch', api: 'indices.get' },
      { target: 'kibana', api: 'agent-builder.put-agent-builder-agents-id' },
      { target: 'kibana', api: 'agent-builder.get-agent-builder-agents-id' },
    ]);

    expect(destructive).toEqual([
      { target: 'elasticsearch', api: 'indices.delete' },
      { target: 'kibana', api: 'agent-builder.put-agent-builder-agents-id' },
    ]);
    expect(nonDestructive).toEqual([
      { target: 'elasticsearch', api: 'indices.get' },
      { target: 'kibana', api: 'agent-builder.get-agent-builder-agents-id' },
    ]);
  });

  it('keeps a PUT the registry does not consider destructive out of the grant', async () => {
    const { destructive, nonDestructive } = await partitionDestructiveApis([
      { target: 'elasticsearch', api: 'indices.create' },
    ]);

    expect(destructive).toEqual([]);
    expect(nonDestructive).toEqual([{ target: 'elasticsearch', api: 'indices.create' }]);
  });

  it('keeps wildcards without resolving what they cover', async () => {
    const { destructive, nonDestructive } = await partitionDestructiveApis([
      { target: 'elasticsearch', api: '*' },
      { target: 'kibana', api: 'alerting.*' },
    ]);

    expect(destructive).toEqual([
      { target: 'elasticsearch', api: '*' },
      { target: 'kibana', api: 'alerting.*' },
    ]);
    expect(nonDestructive).toEqual([]);
  });

  it('lists wildcards ahead of the state-changing identifiers requested alongside them', async () => {
    const { destructive, nonDestructive } = await partitionDestructiveApis([
      { target: 'elasticsearch', api: 'indices.delete' },
      { target: 'elasticsearch', api: 'indices.get' },
      { target: 'kibana', api: 'alerting.*' },
    ]);

    expect(destructive).toEqual([
      { target: 'kibana', api: 'alerting.*' },
      { target: 'elasticsearch', api: 'indices.delete' },
    ]);
    expect(nonDestructive).toEqual([{ target: 'elasticsearch', api: 'indices.get' }]);
  });

  it('keeps an identifier it cannot load, so a registry failure never narrows a grant', async () => {
    const { destructive, nonDestructive } = await partitionDestructiveApis([
      { target: 'elasticsearch', api: 'indices.does-not-exist' },
    ]);

    expect(destructive).toEqual([{ target: 'elasticsearch', api: 'indices.does-not-exist' }]);
    expect(nonDestructive).toEqual([]);
  });
});

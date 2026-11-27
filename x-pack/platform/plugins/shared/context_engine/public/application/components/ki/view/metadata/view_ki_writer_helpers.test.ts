/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKiWriterAgentManageHref, getWriterAgentId } from './view_ki_writer_helpers';

describe('getWriterAgentId', () => {
  it('reads agent_id from writer metadata', () => {
    expect(getWriterAgentId({ run_id: 'run-1', agent_id: 'elastic_agent' })).toBe('elastic_agent');
    expect(getWriterAgentId({ run_id: 'run-1', agent_id: 42 })).toBe('42');
    expect(getWriterAgentId({ run_id: 'run-1', agent_id: '' })).toBeUndefined();
    expect(getWriterAgentId({ run_id: 'run-1' })).toBeUndefined();
  });
});

describe('getKiWriterAgentManageHref', () => {
  const getUrlForApp = (appId: string, options?: { path?: string }) =>
    `/app/${appId}${options?.path ?? ''}`;

  it('maps agent ids to manage paths', () => {
    expect(getKiWriterAgentManageHref(getUrlForApp, 'elastic-ai-agent')).toBe(
      '/app/agent_builder/manage/agents/elastic-ai-agent'
    );
  });
});

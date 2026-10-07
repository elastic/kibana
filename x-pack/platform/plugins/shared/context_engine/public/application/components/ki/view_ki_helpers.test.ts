/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getKiWriterAgentManageHref,
  getKiWriterUriHref,
  getWriterAgentId,
  parseWriterUri,
  readKiGovernance,
} from './view_ki_helpers';

describe('parseWriterUri', () => {
  it('parses scheme and identifier', () => {
    expect(parseWriterUri('workflow://quick-test-metadata-2')).toEqual({
      scheme: 'workflow',
      identifier: 'quick-test-metadata-2',
    });
    expect(parseWriterUri('tool://platform.context_engine.remember')).toEqual({
      scheme: 'tool',
      identifier: 'platform.context_engine.remember',
    });
  });

  it('returns undefined for non-uri values', () => {
    expect(parseWriterUri('not-a-uri')).toBeUndefined();
    expect(parseWriterUri('workflow://')).toBeUndefined();
  });
});

describe('getWriterAgentId', () => {
  it('reads agent_id from writer metadata', () => {
    expect(getWriterAgentId({ run_id: 'run-1', agent_id: 'elastic_agent' })).toBe('elastic_agent');
    expect(getWriterAgentId({ run_id: 'run-1', agent_id: 42 })).toBe('42');
    expect(getWriterAgentId({ run_id: 'run-1', agent_id: '' })).toBeUndefined();
    expect(getWriterAgentId({ run_id: 'run-1' })).toBeUndefined();
  });
});

describe('getKiWriterUriHref', () => {
  const getUrlForApp = (appId: string, options?: { path?: string }) =>
    `/app/${appId}${options?.path ?? ''}`;

  it('maps workflow and tool URIs to app paths', () => {
    expect(getKiWriterUriHref(getUrlForApp, 'workflow://quick-test-metadata-2')).toBe(
      '/app/workflows/quick-test-metadata-2'
    );
    expect(getKiWriterUriHref(getUrlForApp, 'tool://platform.context_engine.remember')).toBe(
      '/app/agent_builder/manage/tools/platform.context_engine.remember'
    );
  });

  it('returns http URIs unchanged', () => {
    expect(getKiWriterUriHref(getUrlForApp, 'https://example.com/wf')).toBe(
      'https://example.com/wf'
    );
  });

  it('returns undefined for unknown schemes', () => {
    expect(getKiWriterUriHref(getUrlForApp, 'custom://foo')).toBeUndefined();
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

describe('readKiGovernance', () => {
  it('accepts string provenance writers', () => {
    expect(
      readKiGovernance({
        governance: { provenance: { created_by: 'workflow://legacy-wf' } },
      }).createdBy
    ).toEqual({ uri: 'workflow://legacy-wf', metadata: {} });
  });

  it('returns a typed lifecycle status when present', () => {
    expect(
      readKiGovernance({
        governance: { lifecycle: { status: 'deleted' } },
      }).lifecycleStatus
    ).toBe('deleted');
    expect(
      readKiGovernance({
        governance: { lifecycle: { status: 'pending' } },
      }).lifecycleStatus
    ).toBeUndefined();
  });
});

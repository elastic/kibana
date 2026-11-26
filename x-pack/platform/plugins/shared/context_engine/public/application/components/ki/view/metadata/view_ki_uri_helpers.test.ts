/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKiConversationHref, getKiUriHref, isDreamingWorkflowUri } from './view_ki_uri_helpers';

describe('getKiUriHref', () => {
  const getUrlForApp = (appId: string, options?: { path?: string }) =>
    `/app/${appId}${options?.path ?? ''}`;

  it('maps workflow and tool URIs to app paths', () => {
    expect(getKiUriHref(getUrlForApp, 'workflow://quick-test-metadata-2')).toBe(
      '/app/workflows/quick-test-metadata-2'
    );
    expect(getKiUriHref(getUrlForApp, 'tool://platform.context_engine.remember')).toBe(
      '/app/agent_builder/manage/tools/platform.context_engine.remember'
    );
  });

  it('returns undefined for non-linkable schemes', () => {
    expect(getKiUriHref(getUrlForApp, 'https://example.com/wf')).toBeUndefined();
    expect(getKiUriHref(getUrlForApp, 'crawler://sml')).toBeUndefined();
    expect(getKiUriHref(getUrlForApp, 'custom://foo')).toBeUndefined();
  });
});

describe('isDreamingWorkflowUri', () => {
  const dreamingWorkflowId = 'system-context-engine-dreaming-ai-index-1';

  it('returns true for dreaming workflow URIs', () => {
    expect(isDreamingWorkflowUri(`workflow://${dreamingWorkflowId}`)).toBe(true);
  });

  it('returns false for other workflow and scheme URIs', () => {
    expect(isDreamingWorkflowUri('workflow://custom-wf')).toBe(false);
    expect(isDreamingWorkflowUri('tool://platform.foo')).toBe(false);
  });
});

describe('getKiConversationHref', () => {
  const getUrlForApp = (appId: string, options?: { path?: string }) =>
    `/app/${appId}${options?.path ?? ''}`;

  it('maps conversation ids to Agent Builder paths', () => {
    expect(getKiConversationHref(getUrlForApp, 'conv-1')).toBe(
      '/app/agent_builder/conversations/conv-1'
    );
  });

  it('encodes special characters in the conversation id', () => {
    expect(getKiConversationHref(getUrlForApp, 'conv/special id')).toBe(
      '/app/agent_builder/conversations/conv%2Fspecial%20id'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { coreMock } from '@kbn/core/public/mocks';
import type { GetAiIndexResponse } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { createAnalyzeAndImproveProvider } from './create_analyze_and_improve_provider';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  description: 'Support tickets',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM tickets' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const createProvider = ({
  hasAgentBuilder = true,
  hasPrivilege = true,
}: {
  hasAgentBuilder?: boolean;
  hasPrivilege?: boolean;
} = {}) => {
  const openChat = jest.fn();

  const agentBuilder = hasAgentBuilder
    ? ({ openChat } as unknown as AgentBuilderPluginStart)
    : undefined;

  const application = coreMock.createStart().application;
  application.capabilities = {
    ...application.capabilities,
    agentBuilder: { show: hasPrivilege },
  };

  return createAnalyzeAndImproveProvider({ agentBuilder, application });
};

describe('createAnalyzeAndImproveProvider', () => {
  it('returns canAnalyze false while analyze and improve is not implemented', () => {
    const provider = createProvider();

    expect(provider.canAnalyze({ aiIndex })).toBe(false);
  });

  it('returns canAnalyze false when agent builder is unavailable', () => {
    const provider = createProvider({ hasAgentBuilder: false });

    expect(provider.canAnalyze({ aiIndex })).toBe(false);
  });

  it('returns canAnalyze false without agent builder privilege', () => {
    const provider = createProvider({ hasPrivilege: false });

    expect(provider.canAnalyze({ aiIndex })).toBe(false);
  });

  it('returns canAnalyze false when ai index is undefined', () => {
    const provider = createProvider();

    expect(provider.canAnalyze({ aiIndex: undefined })).toBe(false);
  });
});

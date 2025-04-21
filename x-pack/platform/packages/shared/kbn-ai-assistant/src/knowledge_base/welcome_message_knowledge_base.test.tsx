/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';

import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';

jest.mock('./select_model_and_install_knowledge_base', () => ({
  __esModule: true,
  SelectModelAndInstallKnowledgeBase: ({ onInstall, isInstalling }: any) => (
    <button onClick={() => onInstall('mock-id')} disabled={isInstalling}>
      Install Knowledge Base
    </button>
  ),
}));

function createMockKnowledgeBase(
  partial: Partial<UseKnowledgeBaseResult> = {}
): UseKnowledgeBaseResult {
  return {
    isInstalling: partial.isInstalling ?? false,
    isPolling: partial.isPolling ?? false,
    install: partial.install ?? (async (_id: string) => {}),
    status: partial.status ?? {
      value: {
        enabled: true,
        errorMessage: undefined,
        kbState: KnowledgeBaseState.NOT_INSTALLED,
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    },
  };
}

function renderComponent(kb: UseKnowledgeBaseResult) {
  return render(<WelcomeMessageKnowledgeBase knowledgeBase={kb} />);
}

describe('WelcomeMessageKnowledgeBase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders install message if isInstalling', () => {
    const kb = createMockKnowledgeBase({
      isInstalling: true,
      status: {
        value: {
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.DEPLOYING_MODEL,
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Setting up Knowledge base/i)).toBeInTheDocument();
  });

  it('renders the success banner after a transition from installing to not installing with no error', async () => {
    // 1) Start in an installing state
    let kb = createMockKnowledgeBase({
      isInstalling: true,
      isPolling: true,
      status: {
        value: { enabled: true, kbState: KnowledgeBaseState.NOT_INSTALLED },
        loading: false,
        refresh: jest.fn(),
      },
    });
    const { rerender } = renderComponent(kb);

    // Should not see success banner initially
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeNull();

    kb = {
      ...kb,
      isInstalling: false,
      isPolling: false,
      status: {
        ...kb.status,
        value: {
          ...kb.status.value,
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.READY,
        },
        loading: false,
        refresh: jest.fn(),
      },
    };

    await act(async () => {
      rerender(<WelcomeMessageKnowledgeBase knowledgeBase={kb} />);
    });

    // Now we should see success banner
    expect(screen.getByText(/Knowledge base successfully installed/i)).toBeInTheDocument();
  });

  it('renders "We are setting up your knowledge base" with the inspect button', () => {
    const kb = createMockKnowledgeBase({
      isInstalling: false,
      isPolling: true,
      status: {
        value: {
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.DEPLOYING_MODEL,
          modelStats: {
            deployment_stats: {
              state: 'starting',
              deployment_id: 'deployment_id',
              model_id: 'model_id',
              nodes: [],
              peak_throughput_per_minute: 0,
              priority: 'normal',
              start_time: 0,
            },
          },
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspect/i)).toBeInTheDocument();
  });

  it('renders "Knowledge Base setup failed" with inspect issues', () => {
    const kb = createMockKnowledgeBase({
      isInstalling: false,
      isPolling: true,
      status: {
        value: {
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.ERROR,
          modelStats: {
            deployment_stats: {
              reason: 'model deployment failed',
              state: 'failed',
              deployment_id: 'deployment_id',
              model_id: 'model_id',
              nodes: [],
              peak_throughput_per_minute: 0,
              priority: 'normal',
              start_time: 0,
            },
          },
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(
      screen.getByText(/Knowledge Base setup failed. Check 'Inspect' for details./i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Inspect/i)).toHaveLength(2);
  });

  it('renders "not set up" if server returns errorMessage (no model exists) but user hasnt started installing', () => {
    const kb = createMockKnowledgeBase({
      isInstalling: false,
      status: {
        value: {
          enabled: true,
          kbState: KnowledgeBaseState.NOT_INSTALLED,
          errorMessage: 'no model',
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/Your Knowledge base hasn't been set up/i)).toBeInTheDocument();
    expect(screen.getByText(/Install Knowledge Base/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inspect/i)).toBeNull();
  });

  it('renders "We are setting up your knowledge base" if model is not ready but endpoint exists', () => {
    const kb = createMockKnowledgeBase({
      isPolling: true,
      status: {
        value: {
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.DEPLOYING_MODEL,
          modelStats: {
            deployment_stats: {
              reason: 'model deployment paused',
              deployment_id: 'deployment_id',
              model_id: 'model_id',
              nodes: [],
              peak_throughput_per_minute: 0,
              priority: 'normal',
              start_time: 0,
            },
          },
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspect/i)).toBeInTheDocument();
  });

  it('renders nothing if the knowledge base is already installed', () => {
    const kb = createMockKnowledgeBase({
      status: {
        value: {
          kbState: KnowledgeBaseState.READY,
          endpoint: { inference_id: 'inference_id' },
          enabled: true,
        },
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.queryByText(/We are setting up your knowledge base/i)).toBeNull();
    expect(screen.queryByText(/Your Knowledge base hasn't been set up/i)).toBeNull();
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeNull();
  });
});

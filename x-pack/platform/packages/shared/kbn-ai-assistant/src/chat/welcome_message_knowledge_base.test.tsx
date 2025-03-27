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
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { coreMock } from '@kbn/core/public/mocks';

const corePluginMock = coreMock.createStart();

describe('WelcomeMessageKnowledgeBase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockKnowledgeBase(
    partial: Partial<UseKnowledgeBaseResult> = {}
  ): UseKnowledgeBaseResult {
    return {
      isInstalling: partial.isInstalling ?? false,
      isPolling: partial.isPolling ?? false,
      install: partial.install ?? jest.fn(),
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
    return render(
      <KibanaRenderContextProvider {...corePluginMock}>
        <WelcomeMessageKnowledgeBase knowledgeBase={kb} />
      </KibanaRenderContextProvider>
    );
  }

  it('renders install message if isInstalling', () => {
    const kb = createMockKnowledgeBase({
      isInstalling: true,
      status: {
        value: {
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.PENDING_MODEL_DEPLOYMENT,
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/Installing Knowledge Base/i)).toBeInTheDocument();
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
    const { rerender, container } = renderComponent(kb);

    // Should not see success banner initially
    expect(container).not.toBeEmptyDOMElement();

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
    expect(container).toBeEmptyDOMElement();
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

    expect(screen.getByText(/You have not set up a Knowledge Base yet./i)).toBeInTheDocument();
    expect(screen.getByText(/Install Knowledge base/i)).toBeInTheDocument();
    // Because we have an installError, we also see "Inspect issues" button
    expect(screen.getByText(/Inspect issues/i)).toBeInTheDocument();
  });

  it('renders "Base setup failed" with inspect issues', () => {
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
    // Because we have an reason error, we also see "Inspect" button
    expect(screen.getAllByText(/Inspect/i)).toHaveLength(2);
  });

  it('renders "not set up" if server returns errorMessage (no endpoint exists) but user hasnt started installing', () => {
    // this happens when no endpoint exists because user has never installed
    // which can happen for on prem users with preconfigured connector where /setup is not
    // automatically called
    const kb = createMockKnowledgeBase({
      isInstalling: false,
      status: {
        value: {
          enabled: true,
          kbState: KnowledgeBaseState.NOT_INSTALLED,
          errorMessage: 'no endpoint',
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/You have not set up a Knowledge Base yet./i)).toBeInTheDocument();
    expect(screen.getByText(/Install Knowledge base/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inspect/i)).toBeNull();
  });

  it('renders "not set up" if model is not ready (but no errorMessage because endpoint exists)', () => {
    // This could happen if the user manually stopped the model in ML,
    // so we have no install error, but ready = false
    const kb = createMockKnowledgeBase({
      isInstalling: false,
      isPolling: true,
      status: {
        value: {
          endpoint: { inference_id: 'inference_id' },
          kbState: KnowledgeBaseState.DEPLOYING_MODEL,
          modelStats: {
            deployment_stats: {
              reason: 'model deployment failed',
              deployment_id: 'deployment_id',
              model_id: 'model_id',
              nodes: [],
              peak_throughput_per_minute: 0,
              priority: 'normal',
              start_time: 0,
            },
          },
          enabled: true,
        },
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/You have not set up a Knowledge Base yet./i)).toBeInTheDocument();
    expect(screen.getByText(/Install Knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspect issues/i)).toBeInTheDocument();
  });

  it('renders nothing if the knowledge base is already installed', () => {
    const kb = createMockKnowledgeBase({
      status: {
        value: {
          kbState: KnowledgeBaseState.READY,
          endpoint: { inference_id: 'inference_id' },
          enabled: true,
          errorMessage: undefined,
        },
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.queryByText(/We are setting up your knowledge base/i)).toBeNull();
    expect(screen.queryByText(/You have not set up a Knowledge Base yet./i)).toBeNull();
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeNull();
  });
});

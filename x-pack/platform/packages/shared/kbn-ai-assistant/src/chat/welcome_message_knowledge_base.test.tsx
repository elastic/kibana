/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';

describe('WelcomeMessageKnowledgeBase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockKnowledgeBase(
    partial: Partial<UseKnowledgeBaseResult> = {}
  ): UseKnowledgeBaseResult {
    return {
      isInstalling: partial.isInstalling ?? false,
      setupKb: partial.setupKb ?? jest.fn(),
      installError: partial.installError,
      status: partial.status ?? {
        value: {
          ready: false,
          enabled: true,
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

  it('renders install message if isInstalling', () => {
    const kb = createMockKnowledgeBase({
      status: {
        value: { ready: false, enabled: true, endpoint: { inference_id: 'inference_id' } },
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
      status: {
        value: { ready: false, enabled: true, endpoint: { inference_id: 'inference_id' } },
        loading: false,
        refresh: jest.fn(),
      },
    });
    const { rerender } = renderComponent(kb);

    // Should not see success banner initially
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeNull();

    // 2) Transition to isInstalling = false, no installError
    kb = {
      ...kb,
      status: {
        ...kb.status,
        value: {
          ...kb.status.value,
          ready: true,
          enabled: true,
        },
      },
    };

    await act(async () => {
      rerender(<WelcomeMessageKnowledgeBase knowledgeBase={kb} />);
    });

    // Now we should see success banner
    expect(screen.getByText(/Knowledge base successfully installed/i)).toBeInTheDocument();
  });

  it('renders "not set up" if installError is present', () => {
    const kb = createMockKnowledgeBase({
      status: {
        value: {
          ready: false,
          enabled: true,
          endpoint: { inference_id: 'inference_id' },
          model_stats: {
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
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    // Because we have an reason error, we also see "Inspect" button
    expect(screen.getByText(/Inspect/i)).toBeInTheDocument();
  });

  it('renders "not set up" if server returns errorMessage (no endpoint exists) but user hasnt started installing', () => {
    // this happens when no endpoint exists because user has never installed
    // which can happen for on prem users with preconfigured connector where /setup is not
    // automatically called
    const kb = createMockKnowledgeBase({
      status: {
        value: {
          ready: false,
          enabled: true,
          errorMessage: 'no endpoint',
        },
        loading: false,
        refresh: jest.fn(),
      },
    });
    renderComponent(kb);

    expect(screen.getByText(/Your Knowledge base hasn't been set up/i)).toBeInTheDocument();
    expect(screen.getByText(/Install Knowledge base/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inspect/i)).toBeNull();
  });

  it('renders "not set up" if model is not ready (but no errorMessage because endpoint exists)', () => {
    // This could happen if the user manually stopped the model in ML,
    // so we have no install error, but ready = false
    const kb = createMockKnowledgeBase({
      status: {
        value: {
          endpoint: { inference_id: 'inference_id' },
          model_stats: {
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
          ready: false,
          enabled: true,
        },
        loading: false,
        error: undefined,
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
          endpoint: { inference_id: 'inference_id' },
          ready: true,
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
    expect(screen.queryByText(/Your Knowledge base hasn't been set up/i)).toBeNull();
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeNull();
  });
});

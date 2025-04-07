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
      kbState: partial.kbState ?? 'NOT_INSTALLED',
      isInstalling: partial.isInstalling ?? false,
      install: partial.install ?? jest.fn(),
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
      kbState: 'CREATING_ENDPOINT',
    });
    renderComponent(kb);

    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Setting up Knowledge base/i)).toBeInTheDocument();
  });

  it('renders deploying model UI when kbState is DEPLOYING_MODEL', () => {
    const kb = createMockKnowledgeBase({
      kbState: 'DEPLOYING_MODEL',
    });
    renderComponent(kb);
    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Setting up Knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/deploying model/i)).toBeInTheDocument();
  });

  it('renders the success banner after a transition from installing to not installing with no error', async () => {
    // 1) Start in an installing state
    let kb = createMockKnowledgeBase({
      kbState: 'CREATING_ENDPOINT',
      isInstalling: true,
    });
    const { rerender } = renderComponent(kb);

    // Should not see success banner initially
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeNull();

    // 2) Transition to isInstalling = false, no installError
    kb = {
      ...kb,
      kbState: 'READY',
      isInstalling: false,
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
    expect(screen.getByText(/Knowledge base successfully installed!/i)).toBeInTheDocument();
  });

  it('renders error UI when kbState is ERROR', () => {
    const kb = createMockKnowledgeBase({
      kbState: 'ERROR',
    });
    renderComponent(kb);

    expect(screen.getByText(/Your knowledge base is not available/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspect issues/i)).toBeInTheDocument();
  });

  it('renders nothing if the knowledge base is already installed', () => {
    const kb = createMockKnowledgeBase({
      status: {
        value: {
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

  it('renders a prompt when kbState is NOT_INSTALLED', () => {
    const kb = createMockKnowledgeBase({
      kbState: 'NOT_INSTALLED',
    });

    renderComponent(kb);

    expect(screen.getByText(/Install Knowledge Base/i)).toBeInTheDocument();
  });

  it('walks through the full install flow: NOT_INSTALLED → CREATING_ENDPOINT → DEPLOYING_MODEL → READY', async () => {
    // 1) Start off NOT_INSTALLED
    let kb = createMockKnowledgeBase({
      kbState: 'NOT_INSTALLED',
      isInstalling: false,
    });

    const { rerender } = renderComponent(kb);

    // Assert that we see the NOT_INSTALLED UI
    expect(screen.getByText(/Install Knowledge Base/i)).toBeInTheDocument();
    // We shouldn't see 'We are setting up your knowledge base' or 'deploying model'
    expect(screen.queryByText(/We are setting up your knowledge base/i)).toBeNull();
    expect(screen.queryByText(/deploying model/i)).toBeNull();

    // 2) Transition to CREATING_ENDPOINT
    kb = {
      ...kb,
      kbState: 'CREATING_ENDPOINT',
      isInstalling: true,
    };

    await act(async () => {
      rerender(<WelcomeMessageKnowledgeBase knowledgeBase={kb} />);
    });

    // Check that we show the 'creating endpoint' or 'setting up' UI
    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/Creating inference endpoint/i)).toBeInTheDocument();

    // 3) Transition to DEPLOYING_MODEL
    kb = {
      ...kb,
      kbState: 'DEPLOYING_MODEL',
      // Still installing
      isInstalling: true,
    };

    await act(async () => {
      rerender(<WelcomeMessageKnowledgeBase knowledgeBase={kb} />);
    });

    // Check that we show 'deploying model'
    expect(screen.getByText(/We are setting up your knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/deploying model/i)).toBeInTheDocument();

    // 4) Finally, transition to READY
    kb = {
      ...kb,
      kbState: 'READY',
      isInstalling: false,
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

    expect(screen.getByText(/Knowledge base successfully installed/i)).toBeInTheDocument();
  });
});

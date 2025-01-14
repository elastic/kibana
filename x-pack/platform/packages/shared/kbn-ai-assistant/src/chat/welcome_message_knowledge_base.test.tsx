/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';

describe('WelcomeMessageKnowledgeBase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  type StatusType = NonNullable<UseKnowledgeBaseResult['status']['value']>;
  type EndpointType = StatusType['endpoint'];
  const endpoint: EndpointType = {
    inference_id: 'obs_ai_assistant_kb_inference',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_threads: 1,
      model_id: '.elser_model_2',
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 1,
      },
    },
  };
  const initKnowledgeBase: UseKnowledgeBaseResult = {
    isInstalling: false,
    install: jest.fn(),
    installError: undefined,
    status: {
      value: {
        ready: false,
        enabled: true,
        errorMessage: 'error',
      },
      loading: false,
      refresh: jest.fn(),
    },
  };
  const defaultConnectors: UseGenAIConnectorsResult = {
    connectors: [
      {
        id: 'default-connector-id',
        actionTypeId: 'action-type-id',
        name: 'Default Connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 0,
      },
    ],
    selectedConnector: undefined,
    loading: false,
    error: undefined,
    selectConnector: jest.fn(),
    reloadConnectors: jest.fn(),
  };
  function renderComponent({
    knowledgeBase,
    connectors,
  }: {
    knowledgeBase: Partial<UseKnowledgeBaseResult>;
    connectors: Partial<UseGenAIConnectorsResult>;
  }) {
    const mergedKnowledgeBase: UseKnowledgeBaseResult = {
      ...initKnowledgeBase,
      ...knowledgeBase,
      status: {
        ...initKnowledgeBase.status,
        ...knowledgeBase.status,
      },
    };

    return render(
      <WelcomeMessageKnowledgeBase
        knowledgeBase={mergedKnowledgeBase}
        connectors={defaultConnectors}
      />
    );
  }

  it('renders "Setting up Knowledge base" message while inference endpoint is installing', () => {
    renderComponent({
      knowledgeBase: {
        isInstalling: true,
      },
      connectors: defaultConnectors,
    });

    expect(
      screen.getByText('We are setting up your knowledge base', { exact: false })
    ).toBeInTheDocument();

    expect(screen.getByText('Setting up Knowledge base', { exact: false })).toBeInTheDocument();
  });
  it('renders "Setting up Knowledge base" message while model is being deployed without deployment or allocation state yet being reported', () => {
    renderComponent({
      knowledgeBase: {
        isInstalling: false,
        status: {
          value: {
            endpoint,
            ready: false,
            enabled: true,
            model_stats: { allocation_count: 0 },
          },
          loading: false,
          refresh: jest.fn(),
        },
      },
      connectors: defaultConnectors,
    });
    expect(
      screen.getByText('We are setting up your knowledge base', { exact: false })
    ).toBeInTheDocument();
  });
  it('renders "Setting up Knowledge base" message while model is being deployed and starting', () => {
    renderComponent({
      knowledgeBase: {
        isInstalling: false,
        status: {
          value: {
            endpoint,
            ready: false,
            enabled: true,
            model_stats: {
              deployment_state: 'starting',
              allocation_state: 'starting',
            },
          },
          loading: false,
          refresh: jest.fn(),
        },
      },
      connectors: defaultConnectors,
    });

    expect(
      screen.getByText('We are setting up your knowledge base', { exact: false })
    ).toBeInTheDocument();
  });
  it('displays success message after installation and hides it after timeout', async () => {
    jest.useFakeTimers();

    // Step 1: Initially not installed
    const { rerender } = renderComponent({
      knowledgeBase: {
        isInstalling: true,
      },
      connectors: defaultConnectors,
    });

    // Step 2: Now it's ready
    await act(async () => {
      rerender(
        <WelcomeMessageKnowledgeBase
          knowledgeBase={{
            ...initKnowledgeBase,
            status: {
              ...initKnowledgeBase.status,
              value: {
                ready: true,
                enabled: true,
                model_stats: { deployment_state: 'started', allocation_state: 'started' },
              },
            },
          }}
          connectors={defaultConnectors}
        />
      );
    });

    // the success message should appear
    expect(screen.queryByText(/Knowledge base successfully installed/i)).toBeInTheDocument();

    // fast-forward until the success message would disappear
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    // now it should be gone
    expect(screen.queryByText('Knowledge base successfully installed')).toBeNull();
  });

  it('renders no install messages when model has been installed and ready', () => {
    // component should render nothing in this state (null)
    renderComponent({
      knowledgeBase: {
        isInstalling: false,
        status: {
          ...initKnowledgeBase.status,
          value: {
            ready: true,
            enabled: true,
            model_stats: { deployment_state: 'started', allocation_state: 'started' },
          },
        },
      },
      connectors: defaultConnectors,
    });
    expect(screen.queryByText(/We are setting up your knowledge base/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your Knowledge base hasn't been set up./i)).not.toBeInTheDocument();
  });

  it('renders knowledge base install and model state inspect when not installing and the inference endpoint installation has an error', () => {
    renderComponent({
      knowledgeBase: {
        isInstalling: false,
        installError: new Error('inference endpoint failed to install'),
      },
      connectors: defaultConnectors,
    });
    expect(
      screen.getByText("Your Knowledge base hasn't been set up", { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText('Install Knowledge base', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Inspect issues', { exact: false })).toBeInTheDocument();
  });

  it('renders knowledge base install and model state inspect when not installing and no errors', () => {
    // this can happen when you have a preconfigured connector,
    // we don't automatically install in this case and just show the same UI as if there was an issue/error
    renderComponent({
      knowledgeBase: {
        isInstalling: false,
      },
      connectors: defaultConnectors,
    });
    expect(
      screen.getByText("Your Knowledge base hasn't been set up", { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText('Install Knowledge base', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Inspect issues', { exact: false })).toBeInTheDocument();
  });

  it('renders knowledge base install and model state inspect when not installing and model is not ready', () => {
    // this state can occur if the model is having a deployment problem
    renderComponent({
      knowledgeBase: {
        isInstalling: false,
        status: {
          ...initKnowledgeBase.status,
          value: {
            ready: false,
            enabled: true,
            model_stats: { deployment_state: 'failed', allocation_state: 'started' },
          },
        },
      },
      connectors: defaultConnectors,
    });
    expect(
      screen.getByText("Your Knowledge base hasn't been set up", { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText('Install Knowledge base', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Inspect issues', { exact: false })).toBeInTheDocument();
  });
});

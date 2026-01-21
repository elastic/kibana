/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreStartMock, render } from '../../helpers/test_helper';
import { waitFor, screen } from '@testing-library/react';
import { SettingsPage } from './settings_page';
import { useKnowledgeBase } from '@kbn/ai-assistant';

jest.mock('@kbn/ai-assistant');

const useKnowledgeBaseMock = useKnowledgeBase as jest.Mock;

const createSpacesMock = (solution: string) =>
  ({
    spaces: {
      getActiveSpace: jest.fn().mockResolvedValue({ solution }),
    },
  } as any);

const createServerlessMock = (projectType: 'observability' | 'search' = 'observability') => {
  const setBreadcrumbs = jest.fn();
  return {
    ...createSpacesMock('classic'),
    serverless: { setBreadcrumbs },
    cloud: {
      serverless: {
        projectType,
      },
    },
  } as any;
};

describe('Settings Page', () => {
  const appContextValue = {
    config: {
      spacesEnabled: true,
      logSourcesEnabled: true,
    },
    setBreadcrumbs: () => {},
  };

  useKnowledgeBaseMock.mockReturnValue({
    status: {
      value: {
        enabled: true,
      },
    },
  });

  it('should navigate to home when not authorized', () => {
    render(<SettingsPage />, {
      coreStart: {
        application: {
          capabilities: {
            observabilityAIAssistant: {
              show: false,
            },
          },
        },
      },
      appContextValue,
    });

    expect(coreStartMock.application.navigateToApp).toBeCalledWith('home');
  });

  it('should render settings and knowledge base tabs', () => {
    const { getByTestId } = render(<SettingsPage />, {
      appContextValue,
    });

    expect(getByTestId('settingsPageTab-settings')).toBeInTheDocument();
    expect(getByTestId('settingsPageTab-knowledge_base')).toBeInTheDocument();
  });

  it('should set breadcrumbs', () => {
    const setBreadcrumbs = jest.fn();
    render(<SettingsPage />, {
      appContextValue: { ...appContextValue, setBreadcrumbs },
    });

    expect(setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'AI Assistants',
        onClick: expect.any(Function),
      },
      {
        text: 'Observability and Search',
      },
    ]);
  });

  it('should show Observability breadcrumb and title when space solution is oblt', async () => {
    const setBreadcrumbs = jest.fn();

    render(<SettingsPage />, {
      coreStart: createSpacesMock('oblt'),
      appContextValue: { ...appContextValue, setBreadcrumbs },
    });

    await waitFor(() => {
      expect(setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'AI Assistants' }),
        expect.objectContaining({ text: 'Observability' }),
      ]);
    });

    expect(await screen.findByText('AI Assistant for Observability')).toBeInTheDocument();
  });

  it('should show Search breadcrumb and title when space solution is es', async () => {
    const setBreadcrumbs = jest.fn();

    render(<SettingsPage />, {
      coreStart: createSpacesMock('es'),
      appContextValue: { ...appContextValue, setBreadcrumbs },
    });

    await waitFor(() => {
      expect(setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'AI Assistants' }),
        expect.objectContaining({ text: 'Search' }),
      ]);
    });

    expect(await screen.findByText('AI Assistant for Search')).toBeInTheDocument();
  });

  it('should show Observability and Search breadcrumb and title in a classic deployment', async () => {
    const setBreadcrumbs = jest.fn();

    render(<SettingsPage />, {
      coreStart: createSpacesMock('classic'),
      appContextValue: { ...appContextValue, setBreadcrumbs },
    });

    await waitFor(() => {
      expect(setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'AI Assistants' }),
        expect.objectContaining({ text: 'Observability and Search' }),
      ]);
    });

    expect(
      await screen.findByText('AI Assistant for Observability and Search')
    ).toBeInTheDocument();
  });

  it('should set the correct breadcrumb when the Serverless solution is oblt', async () => {
    const coreStart = createServerlessMock('observability');
    render(<SettingsPage />, {
      coreStart,
      appContextValue,
    });

    await waitFor(() => {
      expect(coreStart.serverless.setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'AI Assistant' }),
      ]);
    });
  });

  it('should set the correct breadcrumb when the Serverless solution is es', async () => {
    const coreStart = createServerlessMock('search');
    render(<SettingsPage />, {
      coreStart,
      appContextValue,
    });

    await waitFor(() => {
      expect(coreStart.serverless.setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'AI Assistant' }),
      ]);
    });
  });
});

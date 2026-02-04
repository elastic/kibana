/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { I18nProvider } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { AgentBuilderTourStep } from '.';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import { AGENT_BUILDER_TOUR_CONTINUE, AGENT_BUILDER_TOUR_SKIP } from './translations';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());
jest.mock('../common/hooks/use_tour_storage_key', () => ({
  useTourStorageKey: jest.fn().mockReturnValue('test-storage-key'),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiTourStep: ({
      children,
      isStepOpen,
      footerAction,
      content,
      title,
      panelProps,
    }: {
      children: React.ReactNode;
      isStepOpen: boolean;
      footerAction: React.ReactNode[];
      content: React.ReactNode;
      title: React.ReactNode;
      panelProps?: { 'data-test-subj'?: string };
    }) => {
      if (!isStepOpen) {
        return <>{children}</>;
      }
      return (
        <div data-test-subj={panelProps?.['data-test-subj'] || 'tour-step'}>
          <div data-test-subj="tour-title">{title}</div>
          <div data-test-subj="tour-content">{content}</div>
          <div data-test-subj="tour-footer">{footerAction}</div>
          {children}
        </div>
      );
    },
  };
});

const mockToursIsEnabled = jest.fn(() => true);
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const { notificationServiceMock } = jest.requireActual('@kbn/core/public/mocks');
  return {
    useKibana: () => ({
      services: {
        notifications: {
          ...notificationServiceMock.createStartContract(),
          tours: {
            isEnabled: mockToursIsEnabled,
          },
        },
      },
    }),
  };
});

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('AgentBuilderTourStep', () => {
  const mockSetTourState = jest.fn();
  const defaultTourState = {
    currentTourStep: 1,
    isTourActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    mockToursIsEnabled.mockReturnValue(true);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns null when children is not provided', () => {
    const { container } = render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      />,
      {
        wrapper: Wrapper,
      }
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render tour when disabled', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    const { queryByTestId } = render(
      <AgentBuilderTourStep
        isDisabled={true}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByTestId('agentBuilderTourStepPanel')).not.toBeInTheDocument();
    });
  });

  it('does not render tour when user does not allow tours', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    mockToursIsEnabled.mockReturnValue(false);

    const { queryByTestId } = render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByTestId('agentBuilderTourStepPanel')).not.toBeInTheDocument();
    });
  });

  it('does not render tour when tour is not active', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([
      { ...defaultTourState, isTourActive: false },
      mockSetTourState,
    ]);
    const { queryByTestId } = render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByTestId('agentBuilderTourStepPanel')).not.toBeInTheDocument();
    });
  });

  it('renders tour after timer expires when tour is active and not disabled', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    const { queryByTestId } = render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    // Tour should not be visible before timer expires
    expect(queryByTestId('agentBuilderTourStepPanel')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(queryByTestId('agentBuilderTourStepPanel')).toBeInTheDocument();
    });
  });

  it('calls onContinue callback when continue button is clicked', async () => {
    const mockOnContinue = jest.fn();
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
        onContinue={mockOnContinue}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderTourStepPanel')).toBeInTheDocument();
    });

    const continueButton = screen.getByText(AGENT_BUILDER_TOUR_CONTINUE);
    continueButton.click();

    await waitFor(() => {
      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });
  });

  it('finishes tour when continue button is clicked', async () => {
    const mockOnContinue = jest.fn();
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
        onContinue={mockOnContinue}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderTourStepPanel')).toBeInTheDocument();
    });

    const continueButton = screen.getByText(AGENT_BUILDER_TOUR_CONTINUE);
    continueButton.click();

    await waitFor(() => {
      expect(mockSetTourState).toHaveBeenCalled();
    });
  });

  it('finishes tour when skip button is clicked', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([defaultTourState, mockSetTourState]);
    render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderTourStepPanel')).toBeInTheDocument();
    });

    const skipButton = screen.getByText(AGENT_BUILDER_TOUR_SKIP);
    skipButton.click();

    await waitFor(() => {
      expect(mockSetTourState).toHaveBeenCalled();
    });
  });

  it('renders children when tour is not shown', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([
      { ...defaultTourState, isTourActive: false },
      mockSetTourState,
    ]);
    const { getByTestId } = render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    expect(getByTestId('target')).toBeInTheDocument();
  });

  it('renders children when tourState is undefined', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, mockSetTourState]);
    const { getByTestId } = render(
      <AgentBuilderTourStep
        isDisabled={false}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
      >
        <div data-test-subj="target">{'Test'}</div>
      </AgentBuilderTourStep>,
      {
        wrapper: Wrapper,
      }
    );

    expect(getByTestId('target')).toBeInTheDocument();
  });
});

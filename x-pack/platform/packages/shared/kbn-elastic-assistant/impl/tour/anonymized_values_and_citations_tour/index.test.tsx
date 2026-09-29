/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, screen, waitFor } from '@testing-library/react';
import { AnonymizedValuesAndCitationsTour } from '.';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  alertConvo,
  conversationWithContentReferences,
  welcomeConvo,
} from '../../mock/conversation';
import type { TourState } from '../knowledge_base';
import { TestProviders } from '../../mock/test_providers/test_providers';

vi.mock('react-use/lib/useLocalStorage', () => vi.fn());

vi.mock('lodash', () => {
      const mocked = {
      ...require('lodash'),
      throttle: vi.fn().mockImplementation((fn) => fn),
    };
      return { ...mocked, default: mocked };
    });

const mockToursIsEnabled = vi.fn(() => true);
vi.mock('@kbn/kibana-react-plugin/public', async () => {
  const { notificationServiceMock } = (await vi.importActual('@kbn/core/public/mocks'));
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

const mockGetItem = vi.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (...args: string[]) => mockGetItem(...args),
  },
});

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <TestProviders>
    <div>
      <div id="aiAssistantSettingsMenuContainer" />
      {children}
    </div>
  </TestProviders>
);

describe('AnonymizedValuesAndCitationsTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders tour when there are content references', async () => {
    (useLocalStorage as Mock).mockReturnValue([false, vi.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={conversationWithContentReferences} />, {
      wrapper: Wrapper,
    });

    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(screen.getByTestId('anonymizedValuesAndCitationsTourStepPanel')).toBeInTheDocument();
  });

  it('renders tour when there are replacements', async () => {
    (useLocalStorage as Mock).mockReturnValue([false, vi.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={alertConvo} />, {
      wrapper: Wrapper,
    });

    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(screen.getByTestId('anonymizedValuesAndCitationsTourStepPanel')).toBeInTheDocument();
  });

  it('does not render tour if it has already been shown', async () => {
    (useLocalStorage as Mock).mockReturnValue([true, vi.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={alertConvo} />, {
      wrapper: Wrapper,
    });

    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });

  it('does not render tour if the knowledge base tour or EIS tour is on step 1', async () => {
    (useLocalStorage as Mock).mockReturnValueOnce([false, vi.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 1,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={conversationWithContentReferences} />, {
      wrapper: Wrapper,
    });

    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });

  it('does not render tour if there are no content references or replacements', async () => {
    (useLocalStorage as Mock).mockReturnValue([false, vi.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={welcomeConvo} />, {
      wrapper: Wrapper,
    });

    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });

  it('does not render tour when tour is disabled', async () => {
    (useLocalStorage as Mock).mockReturnValue([false, vi.fn()]);
    mockToursIsEnabled.mockReturnValue(false);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={conversationWithContentReferences} />, {
      wrapper: Wrapper,
    });

    vi.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });
});

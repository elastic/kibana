/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { AnonymizedValuesAndCitationsTour } from '.';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  alertConvo,
  conversationWithContentReferences,
  welcomeConvo,
} from '../../mock/conversation';
import { TourState } from '../knowledge_base';
import { TestProviders } from '../../mock/test_providers/test_providers';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  throttle: jest.fn().mockImplementation((fn) => fn),
}));

const mockGetItem = jest.fn();
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
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('renders tour when there are content references', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={conversationWithContentReferences} />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(screen.getByTestId('anonymizedValuesAndCitationsTourStepPanel')).toBeInTheDocument();
  });

  it('renders tour when there are replacements', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={alertConvo} />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(screen.getByTestId('anonymizedValuesAndCitationsTourStepPanel')).toBeInTheDocument();
  });

  it('does not render tour if it has already been shown', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([true, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={alertConvo} />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });

  it('does not render tour if the knowledge base tour or EIS tour is on step 1', async () => {
    (useLocalStorage as jest.Mock).mockReturnValueOnce([false, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 1,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={conversationWithContentReferences} />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });

  it('does not render tour if there are no content references or replacements', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<AnonymizedValuesAndCitationsTour conversation={welcomeConvo} />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('anonymizedValuesAndCitationsTourStep')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('anonymizedValuesAndCitationsTourStepPanel')
    ).not.toBeInTheDocument();
  });
});

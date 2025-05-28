/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ElasticLLMCostAwarenessTour } from '.';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { I18nProvider } from '@kbn/i18n-react';
import { TourState } from '../knowledge_base';

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
  <I18nProvider>{children}</I18nProvider>
);

describe('ElasticLLMCostAwarenessTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('renders tour when there are content references', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    mockGetItem.mockReturnValue(false);

    render(
      <ElasticLLMCostAwarenessTour isDisabled={false} selectedConnectorId=".inference">
        <div data-test-subj="target" />
      </ElasticLLMCostAwarenessTour>,
      {
        wrapper: Wrapper,
      }
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('elasticLLMTourStepPanel')).toBeInTheDocument();
    });
  });

  it('does not render tour if it has already been shown', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([true, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<ElasticLLMCostAwarenessTour isDisabled={false} selectedConnectorId=".inference" />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByTestId('elasticLLMTourStepPanel')).not.toBeInTheDocument();
    });
  });

  it('does not render tour if disabled', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    mockGetItem.mockReturnValue(
      JSON.stringify({
        currentTourStep: 2,
        isTourActive: true,
      } as TourState)
    );

    render(<ElasticLLMCostAwarenessTour isDisabled={true} selectedConnectorId=".inference" />, {
      wrapper: Wrapper,
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.queryByTestId('elasticLLMTourStepPanel')).not.toBeInTheDocument();
    });
  });
});

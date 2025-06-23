/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import { ElasticLLMCostAwarenessTour } from '.';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { useAssistantContext } from '../../assistant_context';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import { docLinksServiceMock } from '@kbn/core/public/mocks';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());
jest.mock('../common/hooks/use_tour_storage_key');
jest.mock('../../assistant_context');
jest.mock('../../connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(),
}));

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  throttle: jest.fn().mockImplementation((fn) => fn),
}));

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('ElasticLLMCostAwarenessTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useAssistantContext as jest.Mock).mockReturnValue({
      inferenceEnabled: true,
      docLinks: docLinksServiceMock.createStartContract(),
    });
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [
        {
          id: '.inference',
          actionTypeId: '.inference',
          isPreconfigured: true,
        },
      ],
    });
  });

  it('renders tour when there are content references', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([
      {
        currentTourStep: 1,
        isTourActive: true,
      },
      jest.fn(),
    ]);

    const { queryByTestId } = render(
      <ElasticLLMCostAwarenessTour
        isDisabled={false}
        selectedConnectorId=".inference"
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ASSISTANT_HEADER}
      >
        <div data-test-subj="target" />
      </ElasticLLMCostAwarenessTour>,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByTestId('elasticLLMTourStepPanel')).toBeInTheDocument();
    });
  });

  it('does not render tour if it has already been shown', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([true, jest.fn()]);

    const { queryByTestId } = render(
      <ElasticLLMCostAwarenessTour
        isDisabled={false}
        selectedConnectorId=".inference"
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ASSISTANT_HEADER}
      />,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByTestId('elasticLLMTourStepPanel')).not.toBeInTheDocument();
    });
  });

  it('does not render tour if disabled', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    const { queryByTestId } = render(
      <ElasticLLMCostAwarenessTour
        isDisabled={true}
        selectedConnectorId=".inference"
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ASSISTANT_HEADER}
      />,
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByTestId('elasticLLMTourStepPanel')).not.toBeInTheDocument();
    });
  });
});

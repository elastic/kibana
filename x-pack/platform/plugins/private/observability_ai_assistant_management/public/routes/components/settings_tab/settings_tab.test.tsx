/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../helpers/test_helper';
import { SettingsTab } from './settings_tab';
import { useAppContext } from '../../../hooks/use_app_context';
import { useKibana } from '../../../hooks/use_kibana';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/public';
import {
  useKnowledgeBase,
  useGenAIConnectors,
  useInferenceEndpoints,
} from '@kbn/ai-assistant/src/hooks';

jest.mock('../../../hooks/use_app_context');
jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_product_doc');
jest.mock('@kbn/ai-assistant/src/hooks');

const useAppContextMock = useAppContext as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useKnowledgeBaseMock = useKnowledgeBase as jest.Mock;
const useGenAIConnectorsMock = useGenAIConnectors as jest.Mock;
const useInferenceEndpointsMock = useInferenceEndpoints as jest.Mock;
const navigateToAppMock = jest.fn(() => Promise.resolve());

describe('SettingsTab', () => {
  const getUrlForAppMock = jest.fn();
  const prependMock = jest.fn();

  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      config: { spacesEnabled: true },
    });
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          getUrlForApp: getUrlForAppMock,
          capabilities: {
            advancedSettings: { save: true },
          },
        },
        http: {
          basePath: { prepend: prependMock },
        },
        productDocBase: undefined,
        notifications: {
          toasts: {
            add: jest.fn(),
          },
        },
      },
    });
    useKnowledgeBaseMock.mockReturnValue({
      status: { value: { enabled: true, inferenceModelState: InferenceModelState.READY } },
      isInstalling: false,
      isPolling: false,
      isWarmingUpModel: false,
      isProductDocInstalling: false,
      isProductDocUninstalling: false,
      installProductDoc: jest.fn().mockResolvedValue(undefined),
      uninstallProductDoc: jest.fn().mockResolvedValue(undefined),
    });
    useGenAIConnectorsMock.mockReturnValue({ connectors: [{ id: 'test-connector' }] });
    useInferenceEndpointsMock.mockReturnValue({
      inferenceEndpoints: [{ id: 'test-endpoint', inference_id: 'test-inference-id' }],
      isLoading: false,
      error: undefined,
    });

    getUrlForAppMock.mockReset();
    prependMock.mockReset();
  });

  it('should show knowledge base model section when the knowledge base is enabled and connectors exist', () => {
    const { getByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    expect(
      getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton')
    ).toBeInTheDocument();
  });

  it('should not show knowledge base model section when no connectors exist', () => {
    useGenAIConnectorsMock.mockReturnValue({ connectors: [] });

    const { queryByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    expect(
      queryByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton')
    ).not.toBeInTheDocument();
  });

  it('should show loading state when knowledge base is being updated', () => {
    useKnowledgeBaseMock.mockReturnValue({
      status: { value: { enabled: true, inferenceModelState: InferenceModelState.READY } },
      isInstalling: true,
      isPolling: true,
      isWarmingUpModel: false,
    });

    const { getByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    expect(getByTestId('observabilityAiAssistantKnowledgeBaseLoadingSpinner')).toBeInTheDocument();
    expect(getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton')).toBeDisabled();
  });
});

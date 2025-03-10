/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_OPENAI_MODEL, OpenAiProviderType } from '../../../common/openai/constants';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useGetDashboard } from '../lib/gen_ai/use_get_dashboard';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { experimentalFeaturesMock } from '../../mocks';

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));
jest.mock('../lib/gen_ai/use_get_dashboard');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const mockDashboard = useGetDashboard as jest.Mock;
const openAiConnector = {
  actionTypeId: '.gen-ai',
  name: 'OpenAI',
  id: '123',
  config: {
    apiUrl: 'https://openaiurl.com',
    apiProvider: OpenAiProviderType.OpenAi,
    defaultModel: DEFAULT_OPENAI_MODEL,
  },
  secrets: {
    apiKey: 'thats-a-nice-looking-key',
  },
  __internal__: {
    hasHeaders: false,
  },
  isDeprecated: false,
};
const azureConnector = {
  ...openAiConnector,
  config: {
    apiUrl: 'https://azureaiurl.com',
    apiProvider: OpenAiProviderType.AzureAi,
  },
  secrets: {
    apiKey: 'thats-a-nice-looking-key',
  },
};
const otherOpenAiConnector = {
  ...openAiConnector,
  config: {
    apiUrl: 'https://localhost/oss-llm',
    apiProvider: OpenAiProviderType.Other,
    defaultModel: 'local-model',
  },
  secrets: {
    apiKey: 'thats-a-nice-looking-key',
  },
};

const navigateToUrl = jest.fn();

describe('ConnectorFields renders', () => {
  beforeAll(() => {
    ExperimentalFeaturesService.init({
      // @ts-ignore force enable for testing
      experimentalFeatures: { ...experimentalFeaturesMock, openAIAdditionalHeadersOn: true },
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToUrl = navigateToUrl;
    mockDashboard.mockImplementation(({ connectorId }) => ({
      dashboardUrl: `https://dashboardurl.com/${connectorId}`,
    }));
  });
  test('open ai connector fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={openAiConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(openAiConnector.config.apiUrl);
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      openAiConnector.config.apiProvider
    );
    expect(getAllByTestId('config.organizationId-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.projectId-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('open-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('open-ai-api-keys-doc')[0]).toBeInTheDocument();
  });

  test('azure ai connector fields are rendered', async () => {
    const { getAllByTestId, queryByTestId } = render(
      <ConnectorFormTestProvider connector={azureConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(azureConnector.config.apiUrl);
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      azureConnector.config.apiProvider
    );
    expect(getAllByTestId('azure-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('azure-ai-api-keys-doc')[0]).toBeInTheDocument();
    expect(queryByTestId('config.organizationId-input')).not.toBeInTheDocument();
    expect(queryByTestId('config.projectId-input')).not.toBeInTheDocument();
  });

  test('other open ai connector fields are rendered', async () => {
    const { getAllByTestId, queryByTestId } = render(
      <ConnectorFormTestProvider connector={otherOpenAiConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(
      otherOpenAiConnector.config.apiUrl
    );
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      otherOpenAiConnector.config.apiProvider
    );
    expect(getAllByTestId('other-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('other-ai-api-keys-doc')[0]).toBeInTheDocument();
    expect(queryByTestId('config.organizationId-input')).not.toBeInTheDocument();
    expect(queryByTestId('config.projectId-input')).not.toBeInTheDocument();
  });
  describe('Headers', () => {
    it('toggles headers as expected', async () => {
      const testFormData = {
        actionTypeId: '.gen-ai',
        name: 'OpenAI',
        id: '123',
        config: {
          apiUrl: 'https://openaiurl.com',
          apiProvider: OpenAiProviderType.OpenAi,
          defaultModel: DEFAULT_OPENAI_MODEL,
        },
        secrets: {
          apiKey: 'thats-a-nice-looking-key',
        },
        isDeprecated: false,
        __internal__: {
          hasHeaders: false,
        },
      };
      render(
        <ConnectorFormTestProvider connector={testFormData}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      const headersToggle = await screen.findByTestId('openAIViewHeadersSwitch');

      expect(headersToggle).toBeInTheDocument();

      await userEvent.click(headersToggle);

      expect(await screen.findByTestId('openAIHeaderText')).toBeInTheDocument();
      expect(await screen.findByTestId('openAIHeadersKeyInput')).toBeInTheDocument();
      expect(await screen.findByTestId('openAIHeadersValueInput')).toBeInTheDocument();
      expect(await screen.findByTestId('openAIAddHeaderButton')).toBeInTheDocument();
    });
    it('succeeds without headers', async () => {
      const testFormData = {
        actionTypeId: '.gen-ai',
        name: 'OpenAI',
        id: '123',
        config: {
          apiUrl: 'https://openaiurl.com',
          apiProvider: OpenAiProviderType.OpenAi,
          defaultModel: DEFAULT_OPENAI_MODEL,
        },
        secrets: {
          apiKey: 'thats-a-nice-looking-key',
        },
        isDeprecated: false,
        __internal__: {
          hasHeaders: false,
        },
      };
      const onSubmit = jest.fn();
      render(
        <ConnectorFormTestProvider connector={testFormData} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            actionTypeId: '.gen-ai',
            name: 'OpenAI',
            id: '123',
            isDeprecated: false,
            config: {
              apiUrl: 'https://openaiurl.com',
              apiProvider: OpenAiProviderType.OpenAi,
              defaultModel: DEFAULT_OPENAI_MODEL,
            },
            secrets: {
              apiKey: 'thats-a-nice-looking-key',
            },
            __internal__: {
              hasHeaders: false,
            },
          },
          isValid: true,
        });
      });
    });
    it('succeeds with headers', async () => {
      const testFormData = {
        actionTypeId: '.gen-ai',
        name: 'OpenAI',
        id: '123',
        config: {
          apiUrl: 'https://openaiurl.com',
          apiProvider: OpenAiProviderType.OpenAi,
          defaultModel: DEFAULT_OPENAI_MODEL,
        },
        secrets: {
          apiKey: 'thats-a-nice-looking-key',
        },
        isDeprecated: false,
        __internal__: {
          hasHeaders: false,
        },
      };
      const onSubmit = jest.fn();
      render(
        <ConnectorFormTestProvider connector={testFormData} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      const headersToggle = await screen.findByTestId('openAIViewHeadersSwitch');
      expect(headersToggle).toBeInTheDocument();
      await userEvent.click(headersToggle);

      await userEvent.type(screen.getByTestId('openAIHeadersKeyInput'), 'hello');
      await userEvent.type(screen.getByTestId('openAIHeadersValueInput'), 'world');
      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            actionTypeId: '.gen-ai',
            name: 'OpenAI',
            id: '123',
            isDeprecated: false,
            config: {
              apiUrl: 'https://openaiurl.com',
              apiProvider: OpenAiProviderType.OpenAi,
              defaultModel: DEFAULT_OPENAI_MODEL,
              headers: [{ key: 'hello', value: 'world' }],
            },
            secrets: {
              apiKey: 'thats-a-nice-looking-key',
            },
            __internal__: {
              hasHeaders: true,
            },
          },
          isValid: true,
        });
      });
    });
  });

  describe('Dashboard link', () => {
    it('Does not render if isEdit is false and dashboardUrl is defined', async () => {
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Does not render if isEdit is true and dashboardUrl is null', async () => {
      mockDashboard.mockImplementation((id: string) => ({
        dashboardUrl: null,
      }));
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Renders if isEdit is true and dashboardUrl is defined', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(getByTestId('link-gen-ai-token-dashboard')).toBeInTheDocument();
    });
    it('On click triggers redirect with correct saved object id', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      fireEvent.click(getByTestId('link-gen-ai-token-dashboard'));
      expect(navigateToUrl).toHaveBeenCalledWith(`https://dashboardurl.com/123`);
    });
  });
  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toBeCalledWith({
        data: openAiConnector,
        isValid: true,
      });
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const connector = {
        ...openAiConnector,
        config: {
          ...openAiConnector.config,
          apiUrl: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    const tests: Array<[string, string]> = [
      ['config.apiUrl-input', 'not-valid'],
      ['secrets.apiKey-input', ''],
    ];
    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...openAiConnector,
        config: {
          ...openAiConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(res.getByTestId(field));
      if (value !== '') {
        await userEvent.type(res.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(res.getByTestId('form-test-provide-submit'));
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});

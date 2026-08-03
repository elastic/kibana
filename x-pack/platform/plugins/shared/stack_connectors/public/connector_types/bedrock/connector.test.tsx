/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import BedrockConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { DEFAULT_MODEL } from '@kbn/connector-schemas/bedrock/constants';
import { useGetDashboard } from '../lib/gen_ai/use_get_dashboard';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';

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
const bedrockConnector = {
  actionTypeId: '.bedrock',
  name: 'bedrock',
  id: '123',
  config: {
    apiUrl: 'https://bedrockurl.com',
    defaultModel: DEFAULT_MODEL,
  },
  secrets: {
    accessKey: 'thats-a-nice-looking-key',
    secret: 'thats-a-nice-looking-secret',
  },
  isDeprecated: false,
};

const navigateToUrl = jest.fn();

describe('BedrockConnectorFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToUrl = navigateToUrl;
    mockDashboard.mockImplementation(({ connectorId }) => ({
      dashboardUrl: `https://dashboardurl.com/${connectorId}`,
    }));
  });
  test('Bedrock connector fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={bedrockConnector}>
        <BedrockConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(bedrockConnector.config.apiUrl);
    expect(getAllByTestId('config.region-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.region-input')[0]).toHaveValue('');
    expect(getAllByTestId('config.defaultModel-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.defaultModel-input')[0]).toHaveValue(
      bedrockConnector.config.defaultModel
    );
    expect(getAllByTestId('bedrock-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('bedrock-api-model-doc')[0]).toBeInTheDocument();
  });

  describe('Dashboard link', () => {
    it('Does not render if isEdit is false and dashboardUrl is defined', async () => {
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={bedrockConnector}>
          <BedrockConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Does not render if isEdit is true and dashboardUrl is null', async () => {
      mockDashboard.mockImplementation((id: string) => ({
        dashboardUrl: null,
      }));
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={bedrockConnector}>
          <BedrockConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Renders if isEdit is true and dashboardUrl is defined', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={bedrockConnector}>
          <BedrockConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(getByTestId('link-gen-ai-token-dashboard')).toBeInTheDocument();
    });
    it('On click triggers redirect with correct saved object id', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={bedrockConnector}>
          <BedrockConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
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
        <ConnectorFormTestProvider connector={bedrockConnector} onSubmit={onSubmit}>
          <BedrockConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toBeCalledWith({
        data: bedrockConnector,
        isValid: true,
      });
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const connector = {
        ...bedrockConnector,
        config: {
          ...bedrockConnector.config,
          apiUrl: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <BedrockConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
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
      ['secrets.accessKey-input', ''],
    ];
    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...bedrockConnector,
        config: {
          ...bedrockConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <BedrockConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
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

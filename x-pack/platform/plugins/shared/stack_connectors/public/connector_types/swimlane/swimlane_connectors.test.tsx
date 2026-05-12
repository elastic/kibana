/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import SwimlaneActionConnectorFields from './swimlane_connectors';
import { useGetApplication } from './use_get_application';
import { applicationFields, mappings } from './mocks';
import { SwimlaneConnectorType } from './types';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { waitFor, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));
jest.mock('./use_get_application');

const useGetApplicationMock = useGetApplication as jest.Mock;
const getApplication = jest.fn();

describe('SwimlaneActionConnectorFields renders', () => {
  beforeAll(() => {
    useGetApplicationMock.mockReturnValue({
      getApplication,
      isLoading: false,
    });
  });

  test('all connector fields are rendered', async () => {
    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('swimlaneApiUrlInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneAppIdInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneApiTokenInput')).toBeInTheDocument();
  });

  test('renders the mappings correctly - connector type all', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await userEvent.click(screen.getByTestId('swimlaneConfigureMapping'));

    expect(await screen.findByTestId('swimlaneAlertIdInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneAlertNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneSeverityInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCaseIdConfig')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCaseNameConfig')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCommentsConfig')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneDescriptionConfig')).toBeInTheDocument();
  });

  test('renders the mappings correctly - connector type cases', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'cases',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await userEvent.click(screen.getByTestId('swimlaneConfigureMapping'));

    expect(await screen.findByTestId('swimlaneCaseIdConfig')).toBeInTheDocument();
    expect(screen.queryByTestId('swimlaneAlertIdInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('swimlaneAlertNameInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('swimlaneSeverityInput')).not.toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCaseIdConfig')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCaseNameConfig')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCommentsConfig')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneDescriptionConfig')).toBeInTheDocument();
  });

  test('renders the mappings correctly - connector type alerts', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'alerts',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await userEvent.click(screen.getByTestId('swimlaneConfigureMapping'));

    expect(await screen.findByTestId('swimlaneAlertIdInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneAlertNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('swimlaneSeverityInput')).toBeInTheDocument();
    expect(screen.queryByTestId('swimlaneCaseIdConfig')).not.toBeInTheDocument();
    expect(screen.queryByTestId('swimlaneCaseNameConfig')).not.toBeInTheDocument();
    expect(screen.getByTestId('swimlaneCommentsConfig')).toBeInTheDocument();
    expect(screen.queryByTestId('swimlaneDescriptionConfig')).not.toBeInTheDocument();
  });

  test('renders the correct options per field', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http://test.com',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await screen.findByTestId('swimlaneApiUrlInput');

    await userEvent.click(screen.getByTestId('swimlaneConfigureMapping'));
    await screen.findByTestId('swimlaneAlertIdInput');

    // EuiComboBox uses react-window which doesn't render options in jsdom.
    // Verify the selected values are displayed in each combobox input instead.
    const verifyComboBoxValue = (testId: string, expectedValue: string) => {
      const input = within(screen.getByTestId(testId)).getByRole('combobox') as HTMLInputElement;
      expect(input).toHaveValue(expectedValue);
    };

    verifyComboBoxValue('swimlaneAlertIdInput', 'Alert Id (alert-id)');
    verifyComboBoxValue('swimlaneAlertNameInput', 'Rule Name (rule-name)');
    verifyComboBoxValue('swimlaneSeverityInput', 'Severity (severity)');
    verifyComboBoxValue('swimlaneCaseIdConfig', 'Case Id (case-id-name)');
    verifyComboBoxValue('swimlaneCaseNameConfig', 'Case Name (case-name)');
    verifyComboBoxValue('swimlaneCommentsConfig', 'Comments (notes)');
    verifyComboBoxValue('swimlaneDescriptionConfig', 'Description (description)');
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      getApplication.mockResolvedValue({
        fields: applicationFields,
      });
    });

    const getConnector = (connectorType: string = 'all') => ({
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http://test.com',
        appId: '1234567asbd32',
        connectorType,
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      id: 'swimlane',
      isDeprecated: false,
    });

    const getMappingsForConnectorType = (connectorType: string) => {
      switch (connectorType) {
        case SwimlaneConnectorType.Cases:
          return {
            caseIdConfig: mappings.caseIdConfig,
            caseNameConfig: mappings.caseNameConfig,
            commentsConfig: mappings.commentsConfig,
            descriptionConfig: mappings.descriptionConfig,
          };
        case SwimlaneConnectorType.Alerts:
          return {
            alertIdConfig: mappings.alertIdConfig,
            commentsConfig: mappings.commentsConfig,
            ruleNameConfig: mappings.ruleNameConfig,
            severityConfig: mappings.severityConfig,
          };
        default:
          return mappings;
      }
    };

    const getConnectorWithEmptyMappings = (connectorType: string = 'all') => {
      const actionConnector = getConnector(connectorType);
      return {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          connectorType,
          mappings: {},
        },
      };
    };

    const tests: Array<[string, string]> = [
      ['swimlaneApiUrlInput', 'not-valid'],
      ['swimlaneAppIdInput', ''],
      ['swimlaneApiTokenInput', ''],
    ];

    it.each([['cases'], ['alerts']])(
      'connector validation succeeds when connector config is valid for connectorType=%p',
      async (connectorType) => {
        const connector = getConnector(connectorType);
        const expectedConnector = {
          ...connector,
          config: {
            ...connector.config,
            mappings: getMappingsForConnectorType(connectorType),
          },
        };
        render(
          <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
            <SwimlaneActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await userEvent.click(screen.getByTestId('form-test-provide-submit'));

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalledWith({ data: expectedConnector, isValid: true });
        });
      }
    );

    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = getConnector();
      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <SwimlaneActionConnectorFields
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

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });

    it('connector validation succeeds when when connectorType=all with empty mappings', async () => {
      const connector = getConnectorWithEmptyMappings();
      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <SwimlaneActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            ...connector,
            config: {
              ...connector.config,
              mappings: {
                alertIdConfig: null,
                caseIdConfig: null,
                caseNameConfig: null,
                commentsConfig: null,
                descriptionConfig: null,
                ruleNameConfig: null,
                severityConfig: null,
              },
            },
          },
          isValid: true,
        });
      });
    });

    it.each([['cases'], ['alerts']])(
      'validates correctly when when connectorType=%p',
      async (connectorType) => {
        const connector = getConnectorWithEmptyMappings(connectorType);

        render(
          <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
            <SwimlaneActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await userEvent.click(screen.getByTestId('form-test-provide-submit'));

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalledWith({
            data: {},
            isValid: false,
          });
        });
      }
    );
  });
});

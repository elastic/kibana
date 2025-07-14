/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionForm } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/action_form';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana';
import { IToasts } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { getConnectorType as getSlackConnectorType } from './slack';
import { getSlackApiConnectorType } from '../slack_api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(() => false),
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connectors');
jest.mock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connector_types'
);
jest.mock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/execute',
  () => ({
    executeAction: async () => ({
      status: 'ok',
      data: {
        ok: true,
        channels: [
          {
            id: 'channel-id',
            name: 'channel-name',
          },
        ],
      },
      connector_id: '.slack_api',
    }),
  })
);
const { loadAllActions } = jest.requireMock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connectors'
);
const { loadActionTypes } = jest.requireMock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connector_types'
);
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

// GET api/actions/connector_types?feature_id=alerting
loadActionTypes.mockResolvedValue([
  {
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    id: '.slack',
    minimumLicenseRequired: 'basic',
    name: 'Slack',
    supportedFeatureIds: ['alerting', 'uptime', 'siem'],
  },
  {
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    id: '.slack_api',
    minimumLicenseRequired: 'basic',
    name: 'Slack API',
    supportedFeatureIds: ['alerting', 'siem'],
  },
]);

// GET api/actions/connectors
loadAllActions.mockResolvedValue([
  {
    actionTypeId: '.slack_api',
    config: {},
    id: 'connector-id',
    isDeprecated: false,
    isMissingSecrets: false,
    isPreconfigured: false,
    name: 'webapi',
    referencedByCount: 0,
  },
]);

const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
actionTypeRegistry.register(getSlackConnectorType());
actionTypeRegistry.register(getSlackApiConnectorType());

const baseProps = {
  actions: [],
  defaultActionGroupId: 'metrics.inventory_threshold.fired',
  ruleTypeId: 'metrics.inventory_threshold',
  hasAlertsMappings: true,
  featureId: 'alerting',
  recoveryActionGroup: 'recovered',
  actionTypeRegistry,
  minimumThrottleInterval: [1, 'm'] as [number | undefined, string],
  producerId: 'infratstructure',
  setActions: jest.fn(),
  setActionIdByIndex: jest.fn(),
  setActionParamsProperty: jest.fn(),
  setActionFrequencyProperty: jest.fn(),
  setActionAlertsFilterProperty: jest.fn(),
};

const mockToasts = {
  danger: jest.fn(),
  warning: jest.fn(),
};

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const original = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      notifications: { toasts: mockToasts },
    }),
  };
});

describe('ActionForm - Slack API Connector', () => {
  beforeAll(() => {
    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
    } as unknown as IToasts;

    useKibanaMock().services.application.capabilities = {
      actions: {
        delete: true,
        save: true,
        show: true,
      },
    } as unknown as ApplicationStart['capabilities'];
  });

  test('show error message when no channel has been selected', async () => {
    const testActions = [
      {
        id: 'connector-id',
        actionTypeId: '.slack_api',
        group: 'metrics.inventory_threshold.fired',
        params: {
          subAction: 'postMessage',
          subActionParams: {
            text: 'text',
            channels: [], // no channel selected
          },
        },
        frequency: {
          notifyWhen: 'onActionGroupChange' as 'onActionGroupChange',
          throttle: null,
          summary: false,
        },
      },
    ];

    const testProps = {
      ...baseProps,
      hasAlertsMappings: false,
      actions: testActions,
    };

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ActionForm {...testProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('Channel ID is required.')).toBeInTheDocument();
  });
});

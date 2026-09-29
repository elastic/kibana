/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionForm } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/action_form';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana';
import type { IToasts } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { getConnectorType as getSlackConnectorType } from './slack';
import { getSlackApiConnectorType } from '../slack_api';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

vi.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
vi.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => {
  const mocked = {
    useUiSetting: vi.fn(() => false),
    useUiSetting$: vi.fn((value: string) => ['0,0']),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connectors');
vi.mock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connector_types'
);
vi.mock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/execute',
  () => {
    const mocked = {
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
    };
    return { ...mocked, default: mocked };
  }
);
const { loadAllActions } = await vi.importMock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connectors'
);
const { loadActionTypes } = await vi.importMock(
  '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api/connector_types'
);
const useKibanaMock = useKibana as Mocked<typeof useKibana>;
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
  setActions: vi.fn(),
  setActionIdByIndex: vi.fn(),
  setActionParamsProperty: vi.fn(),
  setActionFrequencyProperty: vi.fn(),
  setActionAlertsFilterProperty: vi.fn(),
};

const mockToasts = {
  danger: vi.fn(),
  warning: vi.fn(),
};

vi.mock('@kbn/triggers-actions-ui-plugin/public', async () => {
  const original = await vi.importActual('@kbn/triggers-actions-ui-plugin/public');
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
      addSuccess: vi.fn(),
      addError: vi.fn(),
      addDanger: vi.fn(),
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

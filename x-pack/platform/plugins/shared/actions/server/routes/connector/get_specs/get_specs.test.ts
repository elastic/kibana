/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { getConnectorSpecsRoute } from './get_specs';
import type { ActionsConfigurationUtilities } from '../../../actions_config';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { actionsClientMock } from '../../../mocks';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

const createActionsConfigUtilsMock = (): ActionsConfigurationUtilities =>
  ({
    getWebhookSettings: jest.fn(() => ({
      ssl: { pfx: { enabled: true } },
    })),
    isEarsEnabled: jest.fn(() => false),
  } as unknown as ActionsConfigurationUtilities);

describe('getConnectorSpecsRoute', () => {
  it('registers the route with correct path', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecsRoute(router, licenseState, createActionsConfigUtilsMock());

    expect(router.get).toHaveBeenCalledTimes(1);
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector_types/specs');
  });

  it('registers the route with access internal', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecsRoute(router, licenseState, createActionsConfigUtilsMock());

    const [config] = router.get.mock.calls[0];
    expect(config.options?.access).toBe('internal');
  });

  it('registers the route with default actions route security', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecsRoute(router, licenseState, createActionsConfigUtilsMock());

    const [config] = router.get.mock.calls[0];
    expect(config.security).toEqual(DEFAULT_ACTION_ROUTE_SECURITY);
  });

  it('returns 200 with specs from listTypes + getConnectorSpec', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsConfigUtils = createActionsConfigUtilsMock();
    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValue([
      {
        id: '.alienvault-otx',
        name: 'AlienVault OTX',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['workflows'],
        minimumLicenseRequired: 'gold',
        isSystemActionType: false,
        isDeprecated: false,
        source: 'spec',
        isTestable: true,
        hasEvents: false,
        isInboundOnly: false,
        isEarsExperimental: false,
      },
      {
        id: '.slack',
        name: 'Slack',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold',
        isSystemActionType: false,
        isDeprecated: false,
        source: 'stack',
        isTestable: true,
        hasEvents: false,
        isInboundOnly: false,
        isEarsExperimental: false,
      },
    ]);
    const specResult = {
      metadata: {
        id: '.alienvault-otx',
        displayName: 'AlienVault OTX',
        description: 'Threat intel',
        minimumLicense: 'gold' as const,
        supportedFeatureIds: ['workflows'] as const,
      },
      schema: { type: 'object' },
      isTestable: true,
      isInboundOnly: false,
      actions: {
        getIndicator: {
          isTool: true,
          input: {
            type: 'object',
            properties: { indicator: { type: 'string' } },
          },
        },
      },
    };
    actionsClient.getConnectorSpec.mockResolvedValue(specResult as never);

    getConnectorSpecsRoute(router, licenseState, actionsConfigUtils);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);
    const result = await handler(context, req, res);

    expect(result).toEqual({
      body: [
        {
          metadata: {
            id: '.alienvault-otx',
            display_name: 'AlienVault OTX',
            description: 'Threat intel',
            minimum_license: 'gold',
            supported_feature_ids: ['workflows'],
          },
          schema: { type: 'object' },
          is_testable: true,
          is_inbound_only: false,
          actions: {
            getIndicator: {
              is_tool: true,
              input: {
                type: 'object',
                properties: { indicator: { type: 'string' } },
              },
            },
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/"handler"/);
    expect(actionsClient.listTypes).toHaveBeenCalled();
    expect(actionsClient.getConnectorSpec).toHaveBeenCalledTimes(1);
    expect(actionsClient.getConnectorSpec).toHaveBeenCalledWith({
      id: '.alienvault-otx',
      configurationUtilities: actionsConfigUtils,
    });
  });

  it('ensures the license check prevents getting connector specs', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('License check failed');
    });

    getConnectorSpecsRoute(router, licenseState, createActionsConfigUtilsMock());

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await expect(handler(context, req, res)).rejects.toThrow('License check failed');
    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});

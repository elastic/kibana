/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { getConnectorSpecsRoute } from './get_specs';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { actionsClientMock } from '../../../mocks';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getConnectorSpecsRoute', () => {
  it('registers the route with correct path', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecsRoute(router, licenseState);

    expect(router.get).toHaveBeenCalledTimes(1);
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector_types/specs');
  });

  it('registers the route with access internal', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecsRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];
    expect(config.options?.access).toBe('internal');
  });

  it('registers the route with default actions route security', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getConnectorSpecsRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];
    expect(config.security).toEqual(DEFAULT_ACTION_ROUTE_SECURITY);
  });

  it('returns 200 with body from actionsClient.getConnectorSpecs', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    const clientResult = {
      specs: [
        {
          id: '.alienvault-otx',
          metadata: {
            id: '.alienvault-otx',
            displayName: 'AlienVault OTX',
            description: 'Threat intel',
            minimumLicense: 'gold' as const,
            supportedFeatureIds: ['workflows'] as const,
          },
          isInboundOnly: false,
          actions: {
            getIndicator: {
              isTool: true,
              inputJsonSchema: {
                type: 'object',
                properties: { indicator: { type: 'string' } },
              },
            },
          },
        },
      ],
    };
    actionsClient.getConnectorSpecs.mockResolvedValue(clientResult as never);

    getConnectorSpecsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);
    const result = await handler(context, req, res);

    expect(result).toEqual({
      body: {
        specs: [
          {
            id: '.alienvault-otx',
            metadata: {
              id: '.alienvault-otx',
              display_name: 'AlienVault OTX',
              description: 'Threat intel',
              minimum_license: 'gold',
              supported_feature_ids: ['workflows'],
            },
            is_inbound_only: false,
            actions: {
              getIndicator: {
                is_tool: true,
                input_json_schema: {
                  type: 'object',
                  properties: { indicator: { type: 'string' } },
                },
              },
            },
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/"handler"/);
    expect(actionsClient.getConnectorSpecs).toHaveBeenCalled();
  });

  it('ensures the license check prevents getting connector specs', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('License check failed');
    });

    getConnectorSpecsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await expect(handler(context, req, res)).rejects.toThrow('License check failed');
    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});

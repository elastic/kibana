/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { createMockConnectorType } from '../../../application/connector/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { actionsClientMock } from '../../../mocks';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { listTypesRoute } from './list_types';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('listTypesRoute', () => {
  it('lists action types with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector_types"`);

    const listTypes = [
      createMockConnectorType({
        id: '1',
        name: 'name',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        subFeature: 'endpointSecurity',
      }),
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "allow_multiple_system_actions": undefined,
            "description": undefined,
            "enabled": true,
            "enabled_in_config": true,
            "enabled_in_license": true,
            "id": "1",
            "is_deprecated": false,
            "is_experimental": undefined,
            "is_system_action_type": false,
            "is_testable": false,
            "minimum_license_required": "gold",
            "name": "name",
            "source": "stack",
            "sub_feature": "endpointSecurity",
            "supported_feature_ids": Array [
              "alerting",
            ],
          },
        ],
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        {
          id: '1',
          name: 'name',
          enabled: true,
          enabled_in_config: true,
          enabled_in_license: true,
          supported_feature_ids: ['alerting'],
          minimum_license_required: 'gold',
          is_system_action_type: false,
          sub_feature: 'endpointSecurity',
          is_deprecated: false,
          source: 'stack',
          is_testable: false,
        },
      ],
    });
  });

  it('maps subActions to sub_actions on spec-sourced connector types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const listTypes = [
      createMockConnectorType({
        id: '.abuseipdb',
        name: 'AbuseIPDB',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['workflows'],
        subActions: ['checkIp', 'reportIp'],
      }),
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        expect.objectContaining({
          id: '.abuseipdb',
          sub_actions: ['checkIp', 'reportIp'],
        }),
      ],
    });
  });

  it('maps icon from spec metadata onto the list types response', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];
    const icon = 'data:image/svg+xml;base64,abc';

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce([
      createMockConnectorType({
        id: '.abuseipdb',
        name: 'AbuseIPDB',
        source: 'spec',
        icon,
      }),
    ]);
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        expect.objectContaining({
          id: '.abuseipdb',
          icon,
        }),
      ],
    });
  });

  it('passes feature_id if provided as query parameter', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector_types"`);

    const listTypes = [
      createMockConnectorType({
        id: '1',
        name: 'name',
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold',
      }),
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        query: {
          feature_id: 'alerting',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "allow_multiple_system_actions": undefined,
            "description": undefined,
            "enabled": true,
            "enabled_in_config": true,
            "enabled_in_license": true,
            "id": "1",
            "is_deprecated": false,
            "is_experimental": undefined,
            "is_system_action_type": false,
            "is_testable": false,
            "minimum_license_required": "gold",
            "name": "name",
            "source": "stack",
            "sub_feature": undefined,
            "supported_feature_ids": Array [
              "alerting",
            ],
          },
        ],
      }
    `);

    expect(actionsClient.listTypes).toHaveBeenCalledTimes(1);
    expect(actionsClient.listTypes.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "featureId": "alerting",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        {
          id: '1',
          name: 'name',
          enabled: true,
          enabled_in_config: true,
          enabled_in_license: true,
          supported_feature_ids: ['alerting'],
          minimum_license_required: 'gold',
          is_system_action_type: false,
          is_deprecated: false,
          source: 'stack',
          is_testable: false,
        },
      ],
    });
  });

  it('ensures the license allows listing action types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector_types"`);

    const listTypes = [
      createMockConnectorType({
        id: '1',
        name: 'name',
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold',
      }),
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents listing action types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    listTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector_types"`);

    const listTypes = [
      createMockConnectorType({
        id: '1',
        name: 'name',
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold',
      }),
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});

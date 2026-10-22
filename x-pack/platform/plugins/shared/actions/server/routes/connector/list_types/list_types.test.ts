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

  describe('spec-backed connector types', () => {
    it('adds spec fields to spec rows', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      listTypesRoute(router, licenseState);
      const [, handler] = router.get.mock.calls[0];

      const actionsClient = actionsClientMock.create();
      actionsClient.listTypes.mockResolvedValueOnce([
        createMockConnectorType({
          id: '.spec-stub',
          name: 'Spec Stub',
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['workflows'],
          source: 'spec',
          description: 'Spec stub',
          isTestable: true,
          spec: {
            icon: 'logo',
            docsUrl: 'https://example.test',
            authTypeIds: ['api_key_header'],
            hasInboundEvents: false,
            isInboundOnly: false,
            isEarsExperimental: false,
            actions: [
              { name: 'listThings', description: 'List things', isTool: true, scope: 'read' },
            ],
          },
        }),
      ]);
      const [context, req, res] = mockHandlerArguments(
        { actionsClient },
        { query: { feature_id: 'workflows' } },
        ['ok']
      );

      await handler(context, req, res);

      expect(actionsClient.listTypes).toHaveBeenCalledWith({ featureId: 'workflows' });
      expect(res.ok).toHaveBeenCalledWith({
        body: [
          {
            id: '.spec-stub',
            name: 'Spec Stub',
            enabled: true,
            enabled_in_config: true,
            enabled_in_license: true,
            minimum_license_required: 'gold',
            supported_feature_ids: ['workflows'],
            is_system_action_type: false,
            source: 'spec',
            is_deprecated: false,
            description: 'Spec stub',
            is_testable: true,
            icon: 'logo',
            docs_url: 'https://example.test',
            auth_type_ids: ['api_key_header'],
            has_inbound_events: false,
            is_inbound_only: false,
            is_ears_experimental: false,
            actions: [
              { name: 'listThings', description: 'List things', is_tool: true, scope: 'read' },
            ],
          },
        ],
      });
    });

    it('omits spec fields when a spec row has no spec', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      listTypesRoute(router, licenseState);
      const [, handler] = router.get.mock.calls[0];

      const actionsClient = actionsClientMock.create();
      actionsClient.listTypes.mockResolvedValueOnce([
        createMockConnectorType({ id: '.spec-stub', source: 'spec' }),
      ]);
      const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

      await handler(context, req, res);

      const [{ body }] = (res.ok as jest.Mock).mock.calls[0];
      expect(body[0]).toMatchObject({ id: '.spec-stub', source: 'spec' });
      expect(body[0]).not.toHaveProperty('icon');
      expect(body[0]).not.toHaveProperty('auth_type_ids');
      expect(body[0]).not.toHaveProperty('actions');
    });

    it('does not add spec fields to stack rows', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      listTypesRoute(router, licenseState);
      const [, handler] = router.get.mock.calls[0];

      const actionsClient = actionsClientMock.create();
      actionsClient.listTypes.mockResolvedValueOnce([
        createMockConnectorType({ id: '.server-log', name: 'Server log', source: 'stack' }),
      ]);
      const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

      await handler(context, req, res);

      const [{ body }] = (res.ok as jest.Mock).mock.calls[0];
      expect(body[0]).not.toHaveProperty('icon');
      expect(body[0]).not.toHaveProperty('auth_type_ids');
      expect(body[0]).not.toHaveProperty('actions');
    });
  });
});

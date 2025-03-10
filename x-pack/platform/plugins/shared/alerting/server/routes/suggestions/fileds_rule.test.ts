/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { licenseStateMock } from '../../lib/license_state.mock';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { registerFieldsRoute } from './fields_rules';

jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('registerFieldsRoute', () => {
  const mockGetFieldsForWildcard = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetFieldsForWildcard.mockResolvedValue({ fields: ['foo'] });
    IndexPatternsFetcher.prototype.getFieldsForWildcard = mockGetFieldsForWildcard;
  });

  test('happy path route registered', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    registerFieldsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/rules/saved_objects/fields"`);

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          fields: ['alert.*'],
        },
      },
      ['ok']
    );

    expect(
      await handler(
        {
          ...context,
          core: { elasticsearch: { client: { asInternalUser: {} } }, uiSettings: { client: {} } },
        },
        req,
        res
      )
    ).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          "foo",
        ],
      }
    `);
  });

  test('throw error when asking other fields than alert.*', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    registerFieldsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/rules/saved_objects/fields"`);

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          fields: ['alert.*', 'foo'],
        },
      },
      ['ok', 'badRequest']
    );

    expect(
      await handler(
        { ...context, core: { elasticsearch: { client: { asInternalUser: {} } } } },
        req,
        res
      )
    ).toMatchInlineSnapshot(`
      Object {
        "body": [Error: You can only request fields starting with "alert."],
      }
    `);
  });
});

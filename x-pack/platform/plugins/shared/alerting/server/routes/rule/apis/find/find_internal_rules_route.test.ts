/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { findInternalRulesRoute } from './find_internal_rules_route';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const rulesClient = rulesClientMock.create();

describe('findInternalRulesRoute', () => {
  it('registers the route without public access', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRulesRoute(router, licenseState);
    expect(router.post).toHaveBeenCalledWith(
      expect.not.objectContaining({
        options: expect.objectContaining({ access: 'public' }),
      }),
      expect.any(Function)
    );
  });

  it('finds rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRulesRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
          rule_type_ids: ['foo'],
          consumers: ['bar'],
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
            Object {
              "body": Object {
                "data": Array [],
                "page": 1,
                "per_page": 1,
                "total": 0,
              },
            }
        `);

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    expect(rulesClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "excludeFromPublicApi": false,
          "includeSnoozeData": true,
          "options": Object {
            "consumers": Array [
              "bar",
            ],
            "defaultSearchOperator": "OR",
            "page": 1,
            "perPage": 1,
            "ruleTypeIds": Array [
              "foo",
            ],
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        page: 1,
        per_page: 1,
        total: 0,
        data: [],
      },
    });
  });
});

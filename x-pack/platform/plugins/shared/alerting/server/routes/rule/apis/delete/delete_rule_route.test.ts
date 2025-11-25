/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteRuleRoute } from './delete_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockedRule = {
  apiKeyOwner: 'api-key-owner',
  consumer: 'bar',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  enabled: true,
  id: '1',
  name: 'abc',
  alertTypeId: '1',
  tags: ['foo'],
  throttle: '10m',
  schedule: { interval: '12s' },
  params: {
    otherField: false,
  },
  createdAt: new Date('2019-02-12T21:01:22.479Z'),
  updatedAt: new Date('2019-02-12T21:01:22.479Z'),
};

describe('deleteRuleRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
  });

  it('deletes an alert with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteRuleRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.delete).toHaveBeenCalledTimes(1);
    expect(rulesClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    deleteRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        id: '1',
      }
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  describe('internally managed rule types', () => {
    it('returns 400 if the rule type is internally managed', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      rulesClient.get = jest
        .fn()
        .mockResolvedValue({ ...mockedRule, alertTypeId: 'test.internal-rule-type' });

      deleteRuleRoute(router, licenseState);

      const [config, handler] = router.delete.mock.calls[0];

      expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

      rulesClient.delete.mockResolvedValueOnce({});

      const [context, req, res] = mockHandlerArguments(
        {
          rulesClient, // @ts-expect-error: not all args are required for this test
          listTypes: new Map([
            ['test.internal-rule-type', { id: 'test.internal-rule-type', internallyManaged: true }],
          ]),
        },
        {
          params: {
            id: '1',
          },
        },
        ['noContent']
      );

      await expect(handler(context, req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot delete rule of type \\"test.internal-rule-type\\" because it is internally managed."`
      );
    });
  });
});

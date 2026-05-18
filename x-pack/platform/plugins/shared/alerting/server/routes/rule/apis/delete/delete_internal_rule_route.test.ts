/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteInternalRuleRoute } from './delete_rule_route';
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
  params: { otherField: false },
  createdAt: new Date('2019-02-12T21:01:22.479Z'),
  updatedAt: new Date('2019-02-12T21:01:22.479Z'),
};

describe('deleteInternalRuleRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
  });

  it('registers the internal path and access level', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteInternalRuleRoute(router, licenseState);

    const [config] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}"`);
    expect(config.options).toMatchObject({ access: 'internal' });
    expect(config.validate).toEqual(
      expect.objectContaining({ request: expect.objectContaining({ query: expect.anything() }) })
    );
  });

  it('deletes a rule without invalidating API keys synchronously by default', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteInternalRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
        query: {},
      },
      ['noContent']
    );

    await handler(context, req, res);

    expect(rulesClient.delete).toHaveBeenCalledWith({
      id: '1',
      invalidateApiKeyNow: undefined,
    });
    expect(res.noContent).toHaveBeenCalled();
  });

  it('forwards invalidate_api_key_now=true to the rules client', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteInternalRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
        query: { invalidate_api_key_now: true },
      },
      ['noContent']
    );

    await handler(context, req, res);

    expect(rulesClient.delete).toHaveBeenCalledWith({
      id: '1',
      invalidateApiKeyNow: true,
    });
  });

  it('ensures the license allows deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteInternalRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
        query: {},
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet } from '@kbn/core/server';
import { internalDeleteRuleRoute } from './delete_rule_route';
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

describe('internalDeleteRuleRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
  });

  it('registers the internal path, access, and superuser-only authz', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    internalDeleteRuleRoute(router, licenseState);

    const [config] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}"`);
    expect(config.options).toMatchObject({ access: 'internal' });
    expect(config.security).toEqual({
      authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
    });
  });

  it('always invokes synchronous API key invalidation when deleting a rule', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    internalDeleteRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['noContent']
    );

    await handler(context, req, res);

    expect(rulesClient.delete).toHaveBeenCalledWith({
      id: '1',
      invalidateApiKeyNow: true,
    });
    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    internalDeleteRuleRoute(router, licenseState);

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
});

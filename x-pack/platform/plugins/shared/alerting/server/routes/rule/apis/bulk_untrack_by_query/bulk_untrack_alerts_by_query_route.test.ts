/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { bulkUntrackAlertsByQueryRoute } from './bulk_untrack_alerts_by_query_route';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkUntrackAlertsByQueryRoute', () => {
  it('should call bulkUntrack with the proper values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkUntrackAlertsByQueryRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/alerts/_bulk_untrack_by_query');

    rulesClient.bulkUntrackAlerts.mockResolvedValueOnce();

    const requestBody = {
      query: [
        {
          bool: {
            must: {
              term: {
                'kibana.alert.rule.name': 'test',
              },
            },
          },
        },
      ],
      rule_type_ids: ['o11y'],
    };

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: requestBody,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.bulkUntrackAlerts).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkUntrackAlerts.mock.calls[0]).toEqual([
      {
        query: requestBody.query,
        ruleTypeIds: requestBody.rule_type_ids,
        isUsingQuery: true,
      },
    ]);

    expect(res.noContent).toHaveBeenCalled();
  });
});

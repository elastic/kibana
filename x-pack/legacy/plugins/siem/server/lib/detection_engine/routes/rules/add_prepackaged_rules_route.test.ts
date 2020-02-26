/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEmptyFindResult,
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
  getEmptyIndex,
  getNonEmptyIndex,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock } from '../__mocks__';
import { addPrepackedRulesRoute } from './add_prepackaged_rules_route';
import { PrepackagedRules } from '../../types';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getPrepackagedRules: (): PrepackagedRules[] => {
      return [
        {
          tags: [],
          immutable: true,
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          version: 2, // set one higher than the mocks which is set to 1 to trigger updates
        },
      ];
    },
  };
});

describe('add_prepackaged_rules_route', () => {
  let { getRoute, router, response } = serverMock.create();
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    ({ getRoute, router, response } = serverMock.create());
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

    addPrepackedRulesRoute(router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating with a valid actionClient and alertClient', async () => {
      const { handler } = getRoute();
      const request = addPrepackagedRulesRequest();

      await handler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const { handler } = getRoute();
      const request = addPrepackagedRulesRequest();

      await handler(context, request, response);

      expect(response.notFound).toHaveBeenCalled();
    });

    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const { handler } = getRoute();
      const request = addPrepackagedRulesRequest();

      await handler(context, request, response);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: expect.stringContaining(
          'Pre-packaged rules cannot be installed until the signals index is created'
        ),
      });
    });
  });

  describe('responses', () => {
    test('1 rule is installed and 0 are updated when find results are empty', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const request = addPrepackagedRulesRequest();
      await getRoute().handler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          rules_installed: 1,
          rules_updated: 0,
        },
      });
    });

    test('1 rule is updated and 0 are installed when we return a single find and the versions are different', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const request = addPrepackagedRulesRequest();
      await getRoute().handler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          rules_installed: 0,
          rules_updated: 1,
        },
      });
    });
  });
});

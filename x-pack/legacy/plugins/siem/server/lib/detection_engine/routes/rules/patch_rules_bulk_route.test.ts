/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  typicalPayload,
  getFindResultWithSingleHit,
  getPatchBulkRequest,
  getResult,
  typicalMlRulePayload,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../feature_flags';

describe('patch_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.alertsClient.update.mockResolvedValue(getResult()); // update succeeds

    patchRulesBulkRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns an error in the response when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('allows ML Params to be patched', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/bulk_update`,
        body: [
          {
            rule_id: 'my-rule-id',
            anomaly_threshold: 4,
            machine_learning_job_id: 'some_job_id',
          },
        ],
      });
      await server.inject(request, context);

      expect(clients.alertsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              anomalyThreshold: 4,
              machineLearningJobId: 'some_job_id',
            }),
          }),
        })
      );
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    it('rejects patching of an ML rule with an insufficient license', async () => {
      (context.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [typicalMlRulePayload()],
      });

      const response = await server.inject(request, context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: {
            message: 'Your license does not support machine learning. Please upgrade your license.',
            status_code: 400,
          },
          rule_id: 'rule-1',
        },
      ]);
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...typicalPayload(), rule_id: undefined }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" at position 0 fails because ["value" must contain at least one of [id, rule_id]]'
      );
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...typicalPayload(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...typicalPayload(), type: 'unknown_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" at position 0 fails because [child "type" fails because ["type" must be one of [query, saved_query, machine_learning]]]'
      );
    });
  });
});

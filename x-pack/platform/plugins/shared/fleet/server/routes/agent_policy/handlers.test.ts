/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../../services';

import type { FleetRequestHandlerContext } from '../..';
import { xpackMocks } from '../../mocks';

import { bulkGetAgentPoliciesHandler, GetListAgentPolicyOutputsHandler } from './handlers';

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      getByIds: jest.fn(),
      listAllOutputsForPolicies: jest.fn(),
    },
  };
});

const agentPolicyServiceMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

describe('Agent policy API handlers', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  describe('GetListAgentPolicyOutputsHandler', () => {
    it('should deduplicate ids', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          ids: ['1', '1'],
        },
      });
      await GetListAgentPolicyOutputsHandler(context, request, response);
      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(
        expect.anything(),
        ['1'],
        expect.anything()
      );
    });
  });

  describe('bulkGetAgentPoliciesHandler', () => {
    it('should deduplicate ids', async () => {
      agentPolicyServiceMock.getByIds.mockResolvedValueOnce([]);
      const request = httpServerMock.createKibanaRequest({
        body: {
          ids: ['1', '1'],
        },
      });
      await bulkGetAgentPoliciesHandler(context, request, response);
      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(
        expect.anything(),
        ['1'],
        expect.anything()
      );
    });
  });
});

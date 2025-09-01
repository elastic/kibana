/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { getAgentStatusForAgentPolicy } from '../../services/agents/status';

import { getAgentStatusForAgentPolicyHandler, getAvailableVersionsHandler } from './handlers';

jest.mock('../../services/agents/versions', () => {
  return {
    getAvailableVersions: jest.fn().mockReturnValue(['8.1.0', '8.0.0', '7.17.0']),
  };
});

jest.mock('../../services/app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  return {
    appContextService: {
      getLogger: () => loggerMock.create(),
    },
  };
});

jest.mock('../../services/agents/status', () => ({
  getAgentStatusForAgentPolicy: jest.fn(),
}));

describe('Handlers', () => {
  describe('getAgentStatusForAgentPolicyHandler', () => {
    it.each([
      { requested: 'policy-id-1', called: ['policy-id-1'] },
      { requested: ['policy-id-2'], called: ['policy-id-2'] },
      { requested: ['policy-id-3', 'policy-id-4'], called: ['policy-id-3', 'policy-id-4'] },
      ...[undefined, '', []].map((requested) => ({ requested, called: undefined })),
    ])('calls getAgentStatusForAgentPolicy with correct parameters', async (item) => {
      const request = {
        query: {
          policyId: 'policy-id',
          kuery: 'kuery',
          policyIds: item.requested,
        },
      };
      const response = httpServerMock.createResponseFactory();

      await getAgentStatusForAgentPolicyHandler(
        {
          core: coreMock.createRequestHandlerContext(),
          fleet: { internalSoClient: {} },
        } as any,
        request as any,
        response
      );

      expect(getAgentStatusForAgentPolicy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'policy-id',
        'kuery',
        undefined,
        item.called
      );
    });
  });

  describe('getAvailableVersionsHandler', () => {
    it('should return the value from getAvailableVersions', async () => {
      const ctx = coreMock.createCustomRequestHandlerContext(
        coreMock.createRequestHandlerContext()
      );
      const response = httpServerMock.createResponseFactory();

      await getAvailableVersionsHandler(ctx, httpServerMock.createKibanaRequest(), response);

      expect(response.ok).toBeCalled();
      expect(response.ok.mock.calls[0][0]?.body).toEqual({
        items: ['8.1.0', '8.0.0', '7.17.0'],
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock, coreMock } from '@kbn/core/server/mocks';

import { withDefaultErrorHandler } from '../../services/security/fleet_router';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../common/types/models/uninstall_token';

import type {
  GetUninstallTokenRequest,
  GetUninstallTokensMetadataResponse,
  RotateUninstallTokenRequest,
} from '../../../common/types/rest_spec/uninstall_token';

import type { FleetRequestHandlerContext } from '../..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { agentPolicyService, appContextService } from '../../services';
import {
  GetUninstallTokensMetadataResponseSchema,
  type GetUninstallTokenRequestSchema,
  type GetUninstallTokensMetadataRequestSchema,
  GetUninstallTokenResponseSchema,
  RotateUninstallTokenResponseSchema,
} from '../../types/rest_spec/uninstall_token';

import { createAgentPolicyMock } from '../../../common/mocks';

import {
  getUninstallTokenHandler,
  getUninstallTokensMetadataHandler,
  rotateUninstallTokenHandler,
} from './handlers';

const getUninstallTokenHandlerWithErrorHandler = withDefaultErrorHandler(getUninstallTokenHandler);
const getUninstallTokensMetadataHandlerWithErrorHandler = withDefaultErrorHandler(
  getUninstallTokensMetadataHandler
);
const rotateUninstallTokenHandlerWithErrorHandler = withDefaultErrorHandler(
  rotateUninstallTokenHandler
);

jest.mock('../../services/agent_policy');

describe('uninstall token handlers', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let appContextStartContractMock: MockedFleetAppContext;

  beforeEach(async () => {
    context = coreMock.createCustomRequestHandlerContext(xpackMocks.createRequestHandlerContext());
    response = httpServerMock.createResponseFactory();

    appContextStartContractMock = createAppContextStartContractMock();
    appContextService.start(appContextStartContractMock);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('getUninstallTokensMetadataHandler', () => {
    const uninstallTokensFixture: UninstallTokenMetadata[] = [
      {
        id: 'id-1',
        policy_id: 'policy-id-1',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
      },
      {
        id: 'id-2',
        policy_id: 'policy-id-2',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
      },
      {
        id: 'id-3',
        policy_id: 'policy-id-3',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
      },
    ];

    const uninstallTokensResponseFixture: GetUninstallTokensMetadataResponse = {
      items: uninstallTokensFixture,
      total: 3,
      page: 1,
      perPage: 20,
    };

    let getTokenMetadataMock: jest.Mock;
    let request: KibanaRequest<
      unknown,
      TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>
    >;
    const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

    beforeEach(async () => {
      const uninstallTokenService = (await context.fleet).uninstallTokenService.asCurrentUser;
      getTokenMetadataMock = uninstallTokenService.getTokenMetadata as jest.Mock;
      mockAgentPolicyService.list.mockResolvedValue({
        items: [createAgentPolicyMock()],
        total: 1,
        page: 1,
        perPage: 1,
      });

      request = httpServerMock.createKibanaRequest();
    });

    it('should return uninstall tokens for all policies', async () => {
      getTokenMetadataMock.mockResolvedValue(uninstallTokensResponseFixture);

      await getUninstallTokensMetadataHandlerWithErrorHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: uninstallTokensResponseFixture,
      });
      const validateResp = GetUninstallTokensMetadataResponseSchema.validate(
        uninstallTokensResponseFixture
      );
      expect(validateResp).toEqual(uninstallTokensResponseFixture);
    });

    it('should exclude managed and agentless policies from uninstall tokens', async () => {
      const managedPolicy = createAgentPolicyMock({ id: 'managed-policy-id', is_managed: true });
      const agentlessPolicy = createAgentPolicyMock({
        id: 'agentless-policy-id',
        supports_agentless: true,
      });
      mockAgentPolicyService.list.mockResolvedValue({
        items: [managedPolicy, agentlessPolicy],
        total: 2,
        page: 1,
        perPage: 2,
      });
      getTokenMetadataMock.mockResolvedValue(uninstallTokensResponseFixture);

      await getUninstallTokensMetadataHandlerWithErrorHandler(context, request, response);

      expect(mockAgentPolicyService.list).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          kuery: expect.stringContaining('is_managed:true'),
        })
      );
      expect(mockAgentPolicyService.list).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          kuery: expect.stringContaining('supports_agentless:true'),
        })
      );
      expect(getTokenMetadataMock).toHaveBeenCalledWith(undefined, undefined, 1, 20, [
        'managed-policy-id',
        'agentless-policy-id',
      ]);
    });

    it('should return internal error when uninstallTokenService throws error', async () => {
      getTokenMetadataMock.mockRejectedValue(Error('something happened'));

      await getUninstallTokensMetadataHandlerWithErrorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'something happened' },
      });
    });
  });

  describe('getUninstallTokenHandler', () => {
    let uninstallTokenFixture: UninstallToken;

    let getTokenMock: jest.Mock;
    let request: KibanaRequest<TypeOf<typeof GetUninstallTokenRequestSchema.params>>;

    beforeEach(async () => {
      uninstallTokenFixture = {
        id: 'id-1',
        policy_id: 'policy-id-1',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
        token: '123456789',
      };
      const uninstallTokenService = (await context.fleet).uninstallTokenService.asCurrentUser;
      getTokenMock = uninstallTokenService.getToken as jest.Mock;

      const requestOptions: GetUninstallTokenRequest = {
        params: {
          uninstallTokenId: uninstallTokenFixture.id,
        },
      };
      request = httpServerMock.createKibanaRequest(requestOptions);
    });

    it('should return requested uninstall token', async () => {
      getTokenMock.mockResolvedValue(uninstallTokenFixture);

      await getUninstallTokenHandlerWithErrorHandler(context, request, response);

      expect(getTokenMock).toHaveBeenCalledWith(uninstallTokenFixture.id);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          item: uninstallTokenFixture,
        },
      });
      const validateResp = GetUninstallTokenResponseSchema.validate({
        item: uninstallTokenFixture,
      });
      expect(validateResp).toEqual({ item: uninstallTokenFixture });
    });

    it('should return internal error when uninstallTokenService throws error', async () => {
      getTokenMock.mockRejectedValue(Error('something happened'));

      await getUninstallTokenHandlerWithErrorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'something happened' },
      });
    });
  });

  describe('rotateUninstallTokenHandler', () => {
    const agentPolicyId = 'policy-id-1';
    const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

    let generateTokenForPolicyIdMock: jest.Mock;
    let request: KibanaRequest<RotateUninstallTokenRequest['params']>;

    beforeEach(async () => {
      const uninstallTokenService = (await context.fleet).uninstallTokenService.asCurrentUser;
      generateTokenForPolicyIdMock = uninstallTokenService.generateTokenForPolicyId as jest.Mock;

      request = httpServerMock.createKibanaRequest({
        params: { agentPolicyId },
      });
    });

    it('should rotate the token and return a success message for a protected policy', async () => {
      mockAgentPolicyService.get.mockResolvedValue(
        createAgentPolicyMock({ id: agentPolicyId, is_protected: true })
      );
      generateTokenForPolicyIdMock.mockResolvedValue(undefined);

      await rotateUninstallTokenHandlerWithErrorHandler(context, request, response);

      expect(generateTokenForPolicyIdMock).toHaveBeenCalledWith(agentPolicyId, true);
      expect(response.ok).toHaveBeenCalledWith({
        body: { message: 'Uninstall token rotated successfully.' },
      });
      const validateResp = RotateUninstallTokenResponseSchema.validate({
        message: 'Uninstall token rotated successfully.',
      });
      expect(validateResp).toEqual({ message: 'Uninstall token rotated successfully.' });
    });

    it('should return 404 when the agent policy does not exist', async () => {
      mockAgentPolicyService.get.mockResolvedValue(null);

      await rotateUninstallTokenHandlerWithErrorHandler(context, request, response);

      expect(generateTokenForPolicyIdMock).not.toHaveBeenCalled();
      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: `Agent policy not found with id ${agentPolicyId}` },
      });
    });

    it('should return 400 when the policy does not have tamper protection enabled', async () => {
      mockAgentPolicyService.get.mockResolvedValue(
        createAgentPolicyMock({ id: agentPolicyId, is_protected: false })
      );

      await rotateUninstallTokenHandlerWithErrorHandler(context, request, response);

      expect(generateTokenForPolicyIdMock).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('does not have tamper protection enabled'),
        },
      });
    });

    it('should return internal error when the token service throws', async () => {
      mockAgentPolicyService.get.mockResolvedValue(
        createAgentPolicyMock({ id: agentPolicyId, is_protected: true })
      );
      generateTokenForPolicyIdMock.mockRejectedValue(Error('token generation failed'));

      await rotateUninstallTokenHandlerWithErrorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'token generation failed' },
      });
    });
  });
});

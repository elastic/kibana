/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/core/server';

import { appContextService } from '../../services/app_context';
import { iacCallbackService } from '../../services/iac_callback';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import type { IacCallback } from '../../../common/types/models/iac_callback';

import {
  createIacCallbackHandler,
  deleteIacCallbackHandler,
  getIacCallbackHandler,
  receiveIacCallbackHandler,
} from './handlers';

jest.mock('../../services/app_context');
jest.mock('../../services', () => ({ iacProvisionerService: {} }));
jest.mock('../../services/iac_provisioner_integrations', () => ({}));
jest.mock('../../services/telemetry/iac_provisioner_telemetry', () => ({
  reportIacProvisionerRenderCompleted: jest.fn(),
  reportIacProvisionerRenderRequested: jest.fn(),
}));
jest.mock('../../services/iac_callback', () => ({
  iacCallbackService: { create: jest.fn(), get: jest.fn(), receive: jest.fn(), cancel: jest.fn() },
}));
jest.mock('../../services/utils/iac_provisioner', () => ({
  isIacProvisionerEnabled: jest.fn(),
}));

const mockedService = jest.mocked(iacCallbackService);
const mockedEnabled = jest.mocked(isIacProvisionerEnabled);
const mockedAppContext = jest.mocked(appContextService);

const PAYLOAD = {
  role_arn: 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc',
  stack_arn: 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1',
  aws_account_id: '123456789012',
  region: 'us-east-1',
};

const ITEM: IacCallback = {
  id: 'cb-1',
  provider: 'aws',
  status: 'pending',
  created_at: '2026-10-13T10:00:00.000Z',
  created_by: 'elastic',
  space_id: 'default',
  expires_at: '2026-10-13T12:00:00.000Z',
};

const apiKeyUser = (id: string) =>
  ({
    username: 'fleet-iac-callback',
    authentication_type: 'api_key',
    api_key: { id, name: 'k' },
  } as unknown as AuthenticatedUser);
const realmUser = () =>
  ({ username: 'elastic', authentication_type: 'realm' } as unknown as AuthenticatedUser);

const buildContext = (spaceId = 'default') =>
  ({ fleet: Promise.resolve({ spaceId, internalSoClient: {} }) } as any);

describe('IaC callback handlers', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let getCurrentUser: jest.Mock;
  const soClient = { tag: 'internal-so-client' };
  const esClient = { tag: 'internal-es-client' };

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    getCurrentUser = jest.fn();
    mockedAppContext.getLogger.mockReturnValue(loggingSystemMock.createLogger());
    mockedAppContext.getSecurityCore.mockReturnValue({ authc: { getCurrentUser } } as any);
    mockedAppContext.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(soClient as any);
    mockedAppContext.getInternalUserESClient.mockReturnValue(esClient as any);
    mockedEnabled.mockResolvedValue(true);
  });

  describe('createIacCallbackHandler', () => {
    it('returns 404 when the IaC Provisioner is not enabled', async () => {
      mockedEnabled.mockResolvedValue(false);
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createIacCallbackHandler(buildContext(), request, response);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'IaC Provisioner is not enabled' },
      });
      expect(mockedService.create).not.toHaveBeenCalled();
    });

    it('creates the record as the internal user, tagged with the caller and space', async () => {
      getCurrentUser.mockReturnValue(realmUser());
      mockedService.create.mockResolvedValue({ item: ITEM, apiKey: 'encoded-key' });
      const request = httpServerMock.createKibanaRequest({ body: { provider: 'aws' } });

      await createIacCallbackHandler(buildContext('marketing'), request, response);

      expect(mockedService.create).toHaveBeenCalledWith(soClient, esClient, {
        provider: 'aws',
        createdBy: 'elastic',
        spaceId: 'marketing',
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { item: ITEM, api_key: 'encoded-key' } });
    });
  });

  describe('getIacCallbackHandler', () => {
    it('returns the item without any key material', async () => {
      mockedService.get.mockResolvedValue(ITEM);
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await getIacCallbackHandler(buildContext(), request, response);

      expect(mockedService.get).toHaveBeenCalledWith(soClient, 'cb-1');
      expect(response.ok).toHaveBeenCalledWith({ body: { item: ITEM } });
    });

    it('returns 404 for a record created in another space', async () => {
      mockedService.get.mockResolvedValue({ ...ITEM, space_id: 'marketing' });
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await getIacCallbackHandler(buildContext('default'), request, response);

      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });

    it('returns 404 for an unknown record', async () => {
      mockedService.get.mockResolvedValue(undefined);
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'nope' } });

      await getIacCallbackHandler(buildContext(), request, response);

      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });
  });

  describe('deleteIacCallbackHandler', () => {
    it('cancels the record', async () => {
      mockedService.get.mockResolvedValue(ITEM);
      mockedService.cancel.mockResolvedValue({ ...ITEM, status: 'cancelled' });
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await deleteIacCallbackHandler(buildContext(), request, response);

      expect(mockedService.cancel).toHaveBeenCalledWith(soClient, 'cb-1');
      expect(response.ok).toHaveBeenCalledWith({ body: { id: 'cb-1', status: 'cancelled' } });
    });

    it('returns 404 for a record created in another space without cancelling it', async () => {
      mockedService.get.mockResolvedValue({ ...ITEM, space_id: 'marketing' });
      const request = httpServerMock.createKibanaRequest({ params: { callbackId: 'cb-1' } });

      await deleteIacCallbackHandler(buildContext('default'), request, response);

      expect(mockedService.cancel).not.toHaveBeenCalled();
      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });
  });

  describe('receiveIacCallbackHandler', () => {
    const receive = (user: AuthenticatedUser | null) => {
      getCurrentUser.mockReturnValue(user);
      const request = httpServerMock.createKibanaRequest({
        params: { callbackId: 'cb-1' },
        body: PAYLOAD,
      });
      return receiveIacCallbackHandler(buildContext(), request, response);
    };

    it('passes the caller key id to the service and answers 200 on receive', async () => {
      mockedService.receive.mockResolvedValue({
        outcome: 'received',
        item: { ...ITEM, status: 'received' },
      });

      await receive(apiKeyUser('key-1'));

      expect(mockedService.receive).toHaveBeenCalledWith(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { status: 'received' } });
    });

    it('passes no key id when the caller did not authenticate with an API key', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'not_found' });

      await receive(realmUser());

      expect(mockedService.receive).toHaveBeenCalledWith(soClient, 'cb-1', {
        apiKeyId: undefined,
        payload: PAYLOAD,
      });
      expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Callback not found' } });
    });

    it('answers 409 on a conflicting payload', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'conflict', item: ITEM });
      await receive(apiKeyUser('key-1'));
      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: 'Callback already received with different values' },
      });
    });

    it('answers 410 when the record is cancelled or expired', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'gone' });
      await receive(apiKeyUser('key-1'));
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 410,
        body: { message: 'Callback is no longer accepting values' },
      });
    });

    it('answers 400 on cross-field validation failure', async () => {
      mockedService.receive.mockResolvedValue({ outcome: 'invalid', message: 'mismatch' });
      await receive(apiKeyUser('key-1'));
      expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'mismatch' } });
    });
  });
});

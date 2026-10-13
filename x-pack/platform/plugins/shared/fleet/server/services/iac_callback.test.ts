/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { IAC_CALLBACK_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { IacCallbackSOAttributes } from '../types/so_attributes';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { invalidateAPIKeys } from './api_keys/security';
import { iacCallbackService, IAC_CALLBACK_EXPIRATION } from './iac_callback';

jest.mock('./app_context');
jest.mock('./audit_logging');
jest.mock('./api_keys/security');
jest.mock('uuid', () => ({ v4: () => 'cb-1' }));

const mockedInvalidate = jest.mocked(invalidateAPIKeys);
const mockedAudit = jest.mocked(auditLoggingService);

const ROLE_ARN = 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc';
const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1';
const PAYLOAD = {
  role_arn: ROLE_ARN,
  stack_arn: STACK_ARN,
  aws_account_id: '123456789012',
  region: 'us-east-1',
};

const NOW = new Date('2026-10-13T10:00:00.000Z');
const FUTURE = '2026-10-13T12:00:00.000Z';
const PAST = '2026-10-13T09:00:00.000Z';

const pendingAttrs = (
  overrides: Partial<IacCallbackSOAttributes> = {}
): IacCallbackSOAttributes => ({
  provider: 'aws',
  status: 'pending',
  api_key_id: 'key-1',
  created_at: '2026-10-13T09:59:00.000Z',
  created_by: 'elastic',
  space_id: 'default',
  expires_at: FUTURE,
  ...overrides,
});

const soWith = (attributes: IacCallbackSOAttributes) => ({
  id: 'cb-1',
  type: IAC_CALLBACK_SAVED_OBJECT_TYPE,
  references: [],
  attributes,
});

describe('iacCallbackService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    soClient = savedObjectsClientMock.create();
    jest.mocked(appContextService.getLogger).mockReturnValue(loggerMock.create());
    mockedInvalidate.mockResolvedValue({
      invalidated_api_keys: ['key-1'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('mints a zero-privilege key bound to the record and returns the encoded key once', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.security.createApiKey.mockResolvedValue({
        id: 'key-1',
        name: 'fleet-iac-callback-cb-1',
        api_key: 'secret',
        encoded: 'ignored',
        expiration: new Date(FUTURE).getTime(),
      });
      soClient.create.mockImplementation(async (type, attributes, options) => ({
        id: options?.id ?? 'cb-1',
        type,
        references: [],
        attributes: attributes as IacCallbackSOAttributes,
      }));

      const { item, apiKey } = await iacCallbackService.create(soClient, esClient, {
        provider: 'aws',
        createdBy: 'elastic',
        spaceId: 'default',
      });

      expect(esClient.security.createApiKey).toHaveBeenCalledWith({
        name: 'fleet-iac-callback-cb-1',
        expiration: IAC_CALLBACK_EXPIRATION,
        metadata: { managed_by: 'fleet', managed: true, type: 'iac_callback', callback_id: 'cb-1' },
        role_descriptors: {
          'fleet-apikey-iac-callback': {
            cluster: [],
            index: [],
            applications: [
              { application: 'fleet', privileges: ['no-privileges'], resources: ['*'] },
            ],
          },
        },
      });
      expect(apiKey).toBe(Buffer.from('key-1:secret').toString('base64'));
      // Literal on purpose: the constants barrel lists its exports, so a missing re-export would
      // make both sides undefined and this assertion meaningless.
      expect(soClient.create).toHaveBeenCalledWith(
        'fleet-iac-callback',
        {
          provider: 'aws',
          status: 'pending',
          api_key_id: 'key-1',
          created_at: NOW.toISOString(),
          created_by: 'elastic',
          space_id: 'default',
          expires_at: FUTURE,
        },
        { id: 'cb-1' }
      );
      expect(item).toEqual({
        id: 'cb-1',
        provider: 'aws',
        status: 'pending',
        created_at: NOW.toISOString(),
        created_by: 'elastic',
        space_id: 'default',
        expires_at: FUTURE,
      });
      // The stored record and the returned item never carry the key or its id.
      expect(JSON.stringify(item)).not.toContain('secret');
      expect(item).not.toHaveProperty('api_key_id');
    });
  });

  describe('get', () => {
    it('returns undefined for an unknown id', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(IAC_CALLBACK_SAVED_OBJECT_TYPE, 'nope')
      );
      expect(await iacCallbackService.get(soClient, 'nope')).toBeUndefined();
    });

    it('strips the api key id from the item', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      const item = await iacCallbackService.get(soClient, 'cb-1');
      expect(item).toEqual({
        id: 'cb-1',
        provider: 'aws',
        status: 'pending',
        created_at: '2026-10-13T09:59:00.000Z',
        created_by: 'elastic',
        space_id: 'default',
        expires_at: FUTURE,
      });
    });
  });

  describe('receive', () => {
    it('is not_found for an unknown record', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(IAC_CALLBACK_SAVED_OBJECT_TYPE, 'nope')
      );
      const result = await iacCallbackService.receive(soClient, 'nope', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is not_found when the caller key is not the one bound to the record', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-other',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });

    it('is not_found when the caller did not authenticate with an API key', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: undefined,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
    });

    it('is gone for a cancelled record', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs({ status: 'cancelled' })));
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'gone' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is gone for an expired pending record and invalidates its key', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs({ expires_at: PAST })));
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'gone' });
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is invalid when the role ARN account differs from aws_account_id', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::999999999999:role/other' },
      });
      expect(result).toEqual({
        outcome: 'invalid',
        message: 'aws_account_id must match the account of role_arn and stack_arn',
      });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is invalid when the stack ARN account differs from aws_account_id', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: {
          ...PAYLOAD,
          stack_arn: 'arn:aws:cloudformation:us-east-1:999999999999:stack/elastic/uuid-1',
        },
      });
      expect(result).toMatchObject({ outcome: 'invalid' });
    });

    it('stores the values, invalidates the key and audit-logs on first receive', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      soClient.update.mockResolvedValue({
        id: 'cb-1',
        type: IAC_CALLBACK_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {},
      });

      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      expect(soClient.update).toHaveBeenCalledWith(IAC_CALLBACK_SAVED_OBJECT_TYPE, 'cb-1', {
        status: 'received',
        received_at: NOW.toISOString(),
        ...PAYLOAD,
      });
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `IaC callback received [id=cb-1] [api_key_id=key-1] [role_arn=${ROLE_ARN}] [aws_account_id=123456789012]`,
      });
      expect(result).toEqual({
        outcome: 'received',
        item: expect.objectContaining({ id: 'cb-1', status: 'received', ...PAYLOAD }),
      });
    });

    it('is idempotent: the same payload after received is received again without writes', async () => {
      soClient.get.mockResolvedValue(
        soWith(pendingAttrs({ status: 'received', received_at: PAST, ...PAYLOAD }))
      );
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toMatchObject({ outcome: 'received' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });

    it('is a conflict when a different payload arrives after received', async () => {
      soClient.get.mockResolvedValue(
        soWith(pendingAttrs({ status: 'received', received_at: PAST, ...PAYLOAD }))
      );
      const result = await iacCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::123456789012:role/another' },
      });
      expect(result).toMatchObject({ outcome: 'conflict' });
      expect(soClient.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('marks a pending record cancelled and invalidates its key', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      soClient.update.mockResolvedValue({
        id: 'cb-1',
        type: IAC_CALLBACK_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {},
      });
      const item = await iacCallbackService.cancel(soClient, 'cb-1');
      expect(soClient.update).toHaveBeenCalledWith(IAC_CALLBACK_SAVED_OBJECT_TYPE, 'cb-1', {
        status: 'cancelled',
      });
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(item).toMatchObject({ id: 'cb-1', status: 'cancelled' });
    });

    it('still invalidates the key of a received record', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs({ status: 'received', ...PAYLOAD })));
      soClient.update.mockResolvedValue({
        id: 'cb-1',
        type: IAC_CALLBACK_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {},
      });
      await iacCallbackService.cancel(soClient, 'cb-1');
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
    });

    it('returns undefined for an unknown record', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(IAC_CALLBACK_SAVED_OBJECT_TYPE, 'nope')
      );
      expect(await iacCallbackService.cancel(soClient, 'nope')).toBeUndefined();
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });
  });
});

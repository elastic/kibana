/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { ProvisioningCallbackSOAttributes } from '../types/so_attributes';

import { CloudConnectorCreateError, FleetError } from '../errors';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { invalidateAPIKeys } from './api_keys/security';
import { cloudConnectorService } from './cloud_connector';
import {
  provisioningCallbackService,
  PROVISIONING_CALLBACK_EXPIRATION,
  PROVISIONING_CALLBACK_TTL_MS,
} from './provisioning_callback';

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
};

const NOW = new Date('2026-10-13T10:00:00.000Z');
const FUTURE = '2026-10-13T12:00:00.000Z';
const PAST = '2026-10-13T09:00:00.000Z';

const pendingAttrs = (
  overrides: Partial<ProvisioningCallbackSOAttributes> = {}
): ProvisioningCallbackSOAttributes => ({
  provider: 'aws',
  status: 'pending',
  api_key_id: 'key-1',
  created_at: '2026-10-13T09:59:00.000Z',
  created_by: 'elastic',
  space_id: 'default',
  expires_at: FUTURE,
  ...overrides,
});

const soWith = (attributes: ProvisioningCallbackSOAttributes) => ({
  id: 'cb-1',
  type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
  references: [],
  version: 'v1',
  attributes,
});

const CONNECTOR_NOT_FOUND = SavedObjectsErrorHelpers.createGenericNotFoundError(
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  'cb-1'
);

const CLAIM = { status: 'receiving', ...PAYLOAD };
const CLAIMED = pendingAttrs({ status: 'receiving', ...PAYLOAD });

describe('provisioningCallbackService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let grantAsInternalUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    grantAsInternalUser = jest.fn();
    jest.mocked(appContextService.getLogger).mockReturnValue(logger);
    jest
      .mocked(appContextService.getSecurity)
      .mockReturnValue({ authc: { apiKeys: { grantAsInternalUser } } } as any);
    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(soClient);
    jest.spyOn(cloudConnectorService, 'create').mockResolvedValue({
      id: 'cc-1',
      name: 'ElasticWorkloadIdentity-abc',
      cloudProvider: 'aws',
      vars: { role_arn: { type: 'text', value: ROLE_ARN } },
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
      packagePolicyCount: 0,
    });
    mockedInvalidate.mockResolvedValue({
      invalidated_api_keys: ['key-1'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const request = httpServerMock.createKibanaRequest();

    beforeEach(() => {
      grantAsInternalUser.mockResolvedValue({
        id: 'key-1',
        name: 'fleet-iac-callback-cb-1',
        api_key: 'secret',
      });
      soClient.create.mockImplementation(async (type, attributes, options) => ({
        id: options?.id ?? 'cb-1',
        type,
        references: [],
        attributes: attributes as ProvisioningCallbackSOAttributes,
      }));
    });

    it('grants a zero-privilege key for the caller through the security plugin and returns it encoded once', async () => {
      const { item, apiKey } = await provisioningCallbackService.create(soClient, request, {
        provider: 'aws',
        createdBy: 'elastic',
        spaceId: 'default',
      });

      // The security plugin grants the key on the caller's behalf, so the caller needs no
      // `manage_api_key` privilege and the key stays attributed to them.
      expect(grantAsInternalUser).toHaveBeenCalledWith(request, {
        name: 'fleet-iac-callback-cb-1',
        expiration: PROVISIONING_CALLBACK_EXPIRATION,
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
      // The grant answer carries no expiration, so the record's comes from the TTL.
      const expiresAt = new Date(NOW.getTime() + PROVISIONING_CALLBACK_TTL_MS).toISOString();
      expect(soClient.create).toHaveBeenCalledWith(
        'fleet-provisioning-callback',
        {
          provider: 'aws',
          status: 'pending',
          api_key_id: 'key-1',
          created_at: NOW.toISOString(),
          created_by: 'elastic',
          space_id: 'default',
          expires_at: expiresAt,
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
        expires_at: expiresAt,
      });
      // The stored record and the returned item never carry the key or its id.
      expect(JSON.stringify(item)).not.toContain('secret');
      expect(item).not.toHaveProperty('api_key_id');
      // Operators can see the launch in the server log, without the key.
      expect(logger.info).toHaveBeenCalledWith(
        `IaC callback created [id=cb-1] [space_id=default] [expires_at=${expiresAt}]`
      );
      expect(JSON.stringify(logger.info.mock.calls)).not.toContain('secret');
    });

    it('stores the name, account type and template details on the record', async () => {
      const { item } = await provisioningCallbackService.create(soClient, request, {
        provider: 'aws',
        identity: {
          connector_name: 'my-identity',
          account_type: 'single-account',
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        },
      });

      expect(soClient.create).toHaveBeenCalledWith(
        'fleet-provisioning-callback',
        expect.objectContaining({
          status: 'pending',
          connector_name: 'my-identity',
          account_type: 'single-account',
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        }),
        { id: 'cb-1' }
      );
      expect(item).toMatchObject({ connector_name: 'my-identity', iac_key: 'sha256:abc' });
    });

    it('fails without creating a record when the security plugin cannot grant a key', async () => {
      // `null` is the contract's answer when API keys are unavailable (licence or security off).
      grantAsInternalUser.mockResolvedValue(null);

      await expect(
        provisioningCallbackService.create(soClient, request, { provider: 'aws' })
      ).rejects.toThrow(FleetError);
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('fails without creating a record when the security plugin is unavailable', async () => {
      jest.mocked(appContextService.getSecurity).mockReturnValue(undefined as any);

      await expect(
        provisioningCallbackService.create(soClient, request, { provider: 'aws' })
      ).rejects.toThrow(FleetError);
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('wraps a grant failure so the record is not created', async () => {
      grantAsInternalUser.mockRejectedValue(new Error('boom'));

      await expect(
        provisioningCallbackService.create(soClient, request, { provider: 'aws' })
      ).rejects.toThrow('Impossible to create an api key: boom');
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns undefined for an unknown id', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'nope'
        )
      );
      expect(await provisioningCallbackService.get(soClient, 'nope')).toBeUndefined();
    });

    it('strips the api key id from the item', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      const item = await provisioningCallbackService.get(soClient, 'cb-1');
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
    /** The record, with no cloud connector of its id yet. */
    const mockRecord = (
      attributes: ProvisioningCallbackSOAttributes,
      connector?: { name: string }
    ) => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(attributes);
        }
        if (connector) {
          return { id, type, references: [], attributes: connector } as any;
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update.mockResolvedValue({
        id: 'cb-1',
        type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        references: [],
        version: 'v2',
        attributes: {},
      });
    };

    it('is not_found for an unknown record', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'nope'
        )
      );
      const result = await provisioningCallbackService.receive(soClient, 'nope', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is not_found when the caller key is not the one bound to the record', async () => {
      mockRecord(pendingAttrs());
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-other',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });

    it('is not_found when the caller did not authenticate with an API key', async () => {
      mockRecord(pendingAttrs());
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: undefined,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
    });

    it('is gone for an expired pending record and invalidates its key', async () => {
      mockRecord(pendingAttrs({ expires_at: PAST }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'gone' });
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is gone for a cancelled record', async () => {
      mockRecord(pendingAttrs({ status: 'cancelled' }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'gone' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });

    it('is invalid when the role ARN and the stack ARN are in different accounts', async () => {
      mockRecord(pendingAttrs());
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::999999999999:role/other' },
      });
      expect(result).toEqual({
        outcome: 'invalid',
        message: 'role_arn and stack_arn must be in the same AWS account',
      });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('claims the record, creates the connector under its id, invalidates the key and audit-logs', async () => {
      mockRecord(pendingAttrs());

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      // The claim is guarded by the version read, so two reports cannot both take it.
      expect(soClient.update).toHaveBeenNthCalledWith(
        1,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        CLAIM,
        { version: 'v1' }
      );
      expect(cloudConnectorService.create).toHaveBeenCalledWith(
        soClient,
        {
          name: 'ElasticWorkloadIdentity-abc',
          cloudProvider: 'aws',
          vars: { role_arn: { type: 'text', value: ROLE_ARN } },
          iac_deployment_id: STACK_ARN,
        },
        { id: 'cb-1' }
      );
      expect(appContextService.getInternalUserSOClientForSpaceId).toHaveBeenCalledWith('default');
      expect(soClient.update).toHaveBeenNthCalledWith(
        2,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'ElasticWorkloadIdentity-abc',
          cloud_connector_id: 'cc-1',
        }
      );
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `IaC callback received [id=cb-1] [api_key_id=key-1] [cloud_connector_id=cc-1] [role_arn=${ROLE_ARN}]`,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'IaC callback received [id=cb-1] [cloud_connector_id=cc-1]'
      );
      expect(result).toEqual({
        outcome: 'received',
        item: expect.objectContaining({
          id: 'cb-1',
          status: 'received',
          ...PAYLOAD,
          cloud_connector_id: 'cc-1',
        }),
      });
    });

    it('creates the connector with the name and template details stored on the record', async () => {
      mockRecord(
        pendingAttrs({
          connector_name: 'my-identity',
          account_type: 'organization-account',
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        })
      );
      jest.mocked(cloudConnectorService.create).mockResolvedValue({
        id: 'cb-1',
        name: 'my-identity',
        cloudProvider: 'aws',
        vars: { role_arn: { type: 'text', value: ROLE_ARN } },
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
        packagePolicyCount: 0,
      });

      await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      expect(cloudConnectorService.create).toHaveBeenCalledWith(
        soClient,
        expect.objectContaining({
          name: 'my-identity',
          accountType: 'organization-account',
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
          iac_deployment_id: STACK_ARN,
          vars: { role_arn: { type: 'text', value: ROLE_ARN } },
        }),
        { id: 'cb-1' }
      );
    });

    it('suffixes the name when that identity name already exists', async () => {
      mockRecord(pendingAttrs({ connector_name: 'my-identity' }));
      jest
        .mocked(cloudConnectorService.create)
        .mockRejectedValueOnce(
          new CloudConnectorCreateError('A cloud connector with this name already exists')
        )
        .mockResolvedValueOnce({
          id: 'cb-1',
          name: 'my-identity cb-1',
          cloudProvider: 'aws',
          vars: { role_arn: { type: 'text', value: ROLE_ARN } },
          created_at: NOW.toISOString(),
          updated_at: NOW.toISOString(),
          packagePolicyCount: 0,
        });

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      expect(cloudConnectorService.create).toHaveBeenNthCalledWith(
        2,
        soClient,
        expect.objectContaining({ name: 'my-identity cb-1' }),
        { id: 'cb-1' }
      );
      expect(result).toMatchObject({
        outcome: 'received',
        item: { cloud_connector_id: 'cb-1', connector_name: 'my-identity cb-1' },
      });
    });

    it('judges the report against what a concurrent report stored when it loses the claim', async () => {
      const other = { ...PAYLOAD, role_arn: 'arn:aws:iam::123456789012:role/another' };
      soClient.get
        .mockResolvedValueOnce(soWith(pendingAttrs()))
        .mockResolvedValueOnce(soWith(pendingAttrs({ status: 'receiving', ...other })));
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({
        outcome: 'conflict',
        item: { status: 'receiving', ...other },
      });
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledTimes(1);
    });

    it('finishes a claimed report whose connector already exists without creating another', async () => {
      // A previous attempt created the connector but failed before marking the record received.
      mockRecord(CLAIMED, { name: 'my-identity' });

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      expect(cloudConnectorService.create).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledTimes(1);
      expect(soClient.update).toHaveBeenCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'my-identity',
          cloud_connector_id: 'cb-1',
        }
      );
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(result).toMatchObject({
        outcome: 'received',
        item: { status: 'received', cloud_connector_id: 'cb-1', connector_name: 'my-identity' },
      });
    });

    it('reuses the connector a concurrent report created when its own create fails', async () => {
      let connectorExists = false;
      soClient.get.mockImplementation(async (type, id) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(CLAIMED);
        }
        if (connectorExists) {
          return { id, type, references: [], attributes: { name: 'my-identity' } } as any;
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update.mockResolvedValue({
        id: 'cb-1',
        type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {},
      });
      jest.mocked(cloudConnectorService.create).mockImplementation(async () => {
        connectorExists = true;
        throw new CloudConnectorCreateError('version conflict, document already exists');
      });

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({
        outcome: 'received',
        item: { cloud_connector_id: 'cb-1', connector_name: 'my-identity' },
      });
    });

    it('releases the claim and rethrows when no connector could be made', async () => {
      mockRecord(pendingAttrs());
      jest
        .mocked(cloudConnectorService.create)
        .mockRejectedValue(new CloudConnectorCreateError('boom'));

      await expect(
        provisioningCallbackService.receive(soClient, 'cb-1', {
          apiKeyId: 'key-1',
          payload: PAYLOAD,
        })
      ).rejects.toThrow('boom');
      // Back to pending, so a retry of the report or a cancel from the browser can proceed. The
      // release is guarded by the claim's version so it cannot undo a concurrent attempt.
      expect(soClient.update).toHaveBeenLastCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        { status: 'pending' },
        { version: 'v2' }
      );
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });

    it('leaves the record alone when a concurrent attempt finished it before the release', async () => {
      mockRecord(pendingAttrs());
      soClient.update
        .mockResolvedValueOnce({ version: 'v2' } as any)
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
            'cb-1'
          )
        );
      jest
        .mocked(cloudConnectorService.create)
        .mockRejectedValue(new CloudConnectorCreateError('boom'));

      await expect(
        provisioningCallbackService.receive(soClient, 'cb-1', {
          apiKeyId: 'key-1',
          payload: PAYLOAD,
        })
      ).rejects.toThrow('boom');
      expect(jest.mocked(appContextService.getLogger)().warn).not.toHaveBeenCalled();
    });

    it('still rethrows when the claim cannot be released', async () => {
      mockRecord(pendingAttrs());
      soClient.update.mockResolvedValueOnce({} as any).mockRejectedValueOnce(new Error('down'));
      jest
        .mocked(cloudConnectorService.create)
        .mockRejectedValue(new CloudConnectorCreateError('boom'));

      await expect(
        provisioningCallbackService.receive(soClient, 'cb-1', {
          apiKeyId: 'key-1',
          payload: PAYLOAD,
        })
      ).rejects.toThrow('boom');
    });

    it('is a conflict when a different payload arrives while the first is being applied', async () => {
      mockRecord(CLAIMED);
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::123456789012:role/another' },
      });
      expect(result).toMatchObject({ outcome: 'conflict' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is idempotent: the same payload after received is received again without writes', async () => {
      mockRecord(pendingAttrs({ status: 'received', received_at: PAST, ...PAYLOAD }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: PAYLOAD,
      });
      expect(result).toMatchObject({ outcome: 'received' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });

    it('is a conflict when a different payload arrives after received', async () => {
      mockRecord(pendingAttrs({ status: 'received', received_at: PAST, ...PAYLOAD }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        apiKeyId: 'key-1',
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::123456789012:role/another' },
      });
      expect(result).toMatchObject({ outcome: 'conflict' });
      expect(soClient.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('returns undefined for an unknown record', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'nope'
        )
      );
      expect(await provisioningCallbackService.cancel(soClient, 'nope')).toBeUndefined();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('marks a pending record cancelled, kills its key and audit-logs', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));
      soClient.update.mockResolvedValue({
        id: 'cb-1',
        type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {},
      });

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).toHaveBeenCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        { status: 'cancelled' },
        { version: 'v1' }
      );
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'User cancelling IaC callback [id=cb-1] [api_key_id=key-1]',
      });
      expect(item).toMatchObject({ id: 'cb-1', status: 'cancelled' });
      expect(item).not.toHaveProperty('api_key_id');
    });

    it.each(['received', 'cancelled'] as const)('leaves a %s record as it is', async (status) => {
      soClient.get.mockResolvedValue(
        soWith(pendingAttrs({ status, ...PAYLOAD, cloud_connector_id: 'cb-1' }))
      );

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedInvalidate).not.toHaveBeenCalled();
      expect(item).toMatchObject({ status, cloud_connector_id: 'cb-1' });
    });

    it('leaves a report that is still being applied alone', async () => {
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(CLAIMED);
        }
        throw CONNECTOR_NOT_FOUND;
      });

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedInvalidate).not.toHaveBeenCalled();
      expect(item).toMatchObject({ status: 'receiving', ...PAYLOAD });
    });

    it('finishes a report whose connector exists but was never marked received', async () => {
      soClient.get.mockImplementation(async (type, id) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(CLAIMED);
        }
        return { id, type, references: [], attributes: { name: 'my-identity' } } as any;
      });
      soClient.update.mockResolvedValue({} as any);

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).toHaveBeenCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'my-identity',
          cloud_connector_id: 'cb-1',
        }
      );
      expect(mockedInvalidate).toHaveBeenCalledWith(['key-1']);
      expect(item).toMatchObject({
        status: 'received',
        cloud_connector_id: 'cb-1',
        connector_name: 'my-identity',
      });
    });

    it('hands back what a report stored when it claimed the record first', async () => {
      soClient.get
        .mockResolvedValueOnce(soWith(pendingAttrs()))
        .mockResolvedValueOnce(soWith(CLAIMED));
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(mockedInvalidate).not.toHaveBeenCalled();
      expect(item).toMatchObject({ status: 'receiving', ...PAYLOAD });
    });
  });
});

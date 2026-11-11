/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { ProvisioningCallbackSOAttributes } from '../types/so_attributes';

import { CloudConnectorCreateError } from '../errors';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { cloudConnectorService } from './cloud_connector';
import { provisioningCallbackService, PROVISIONING_CALLBACK_TTL_MS } from './provisioning_callback';
import {
  isProvisioningCallbackTokenValid,
  mintProvisioningCallbackToken,
} from './provisioning_callback_token';

jest.mock('./app_context');
jest.mock('./audit_logging');
jest.mock('uuid', () => ({ v4: () => 'cb-1' }));

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

/** A record's own token and the hash stored for it. */
const mintFor = (attributes: Pick<ProvisioningCallbackSOAttributes, 'space_id' | 'expires_at'>) =>
  mintProvisioningCallbackToken({
    callbackId: 'cb-1',
    spaceId: attributes.space_id,
    expiresAt: attributes.expires_at,
  });
const { token: TOKEN, tokenHash: TOKEN_HASH } = mintFor({
  space_id: 'default',
  expires_at: FUTURE,
});
const OTHER_TOKEN = mintFor({ space_id: 'default', expires_at: FUTURE }).token;

const pendingAttrs = (
  overrides: Partial<ProvisioningCallbackSOAttributes> = {}
): ProvisioningCallbackSOAttributes => ({
  provider: 'aws',
  status: 'pending',
  token_hash: TOKEN_HASH,
  created_at: '2026-10-13T09:59:00.000Z',
  created_by: 'elastic',
  space_id: 'default',
  expires_at: FUTURE,
  ...overrides,
});

/** The stored record. Without `updatedAt` a claim on it counts as stale. */
const soWith = (attributes: ProvisioningCallbackSOAttributes, updatedAt?: string) => ({
  id: 'cb-1',
  type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
  references: [],
  version: 'v1',
  ...(updatedAt ? { updated_at: updatedAt } : {}),
  attributes,
});
/** A claim written moments ago, by a request that is still applying it. */
const FRESH = new Date(NOW.getTime() - 5_000).toISOString();
const EMPTY_FIND = { saved_objects: [], total: 0, per_page: 100, page: 1 };

const CONNECTOR_NOT_FOUND = SavedObjectsErrorHelpers.createGenericNotFoundError(
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  'cb-1'
);

const CLAIM = { status: 'receiving' as const, ...PAYLOAD };
const CLAIMED = pendingAttrs({ status: 'receiving', ...PAYLOAD });

describe('provisioningCallbackService', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue(EMPTY_FIND);
    logger = loggerMock.create();
    jest.mocked(appContextService.getLogger).mockReturnValue(logger);
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
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    beforeEach(() => {
      soClient.create.mockImplementation(async (type, attributes, options) => ({
        id: options?.id ?? 'cb-1',
        type,
        references: [],
        attributes: attributes as ProvisioningCallbackSOAttributes,
      }));
    });

    it('mints a token bound to the record, stores only its hash and returns the token once', async () => {
      const { item, token } = await provisioningCallbackService.create(soClient, {
        provider: 'aws',
        createdBy: 'elastic',
        spaceId: 'default',
      });

      const expiresAt = new Date(NOW.getTime() + PROVISIONING_CALLBACK_TTL_MS).toISOString();
      expect(soClient.create).toHaveBeenCalledWith(
        'fleet-provisioning-callback',
        {
          provider: 'aws',
          status: 'pending',
          token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
          created_at: NOW.toISOString(),
          created_by: 'elastic',
          space_id: 'default',
          expires_at: expiresAt,
        },
        { id: 'cb-1' }
      );
      // The stored hash is the one for this token, this record and this expiry.
      const [, attributes] = soClient.create.mock.calls[0] as [
        string,
        ProvisioningCallbackSOAttributes
      ];
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(
        isProvisioningCallbackTokenValid(
          token,
          { callbackId: 'cb-1', spaceId: 'default', expiresAt },
          attributes.token_hash
        )
      ).toBe(true);
      expect(attributes.token_hash).not.toBe(token);
      expect(item).toEqual({
        id: 'cb-1',
        provider: 'aws',
        status: 'pending',
        created_at: NOW.toISOString(),
        created_by: 'elastic',
        space_id: 'default',
        expires_at: expiresAt,
      });
      // The returned item never carries the token or its hash.
      expect(JSON.stringify(item)).not.toContain(token);
      expect(item).not.toHaveProperty('token_hash');
      // Operators can see the launch in the server log, without the token.
      expect(logger.info).toHaveBeenCalledWith(
        `Provisioning callback created [id=cb-1] [space_id=default] [expires_at=${expiresAt}]`
      );
      expect(JSON.stringify(logger.info.mock.calls)).not.toContain(token);
      expect(JSON.stringify(mockedAudit.writeCustomAuditLog.mock.calls)).not.toContain(token);
    });

    it('stores the name, account type and template details on the record', async () => {
      const { item } = await provisioningCallbackService.create(soClient, {
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
  });

  describe('expired record sweep on create', () => {
    const create = () =>
      provisioningCallbackService.create(soClient, {
        provider: 'aws',
        createdBy: 'elastic',
        spaceId: 'default',
      });

    beforeEach(() => {
      soClient.create.mockResolvedValue(soWith(pendingAttrs()) as any);
    });

    it('deletes records past their expiry once the new one exists, leaving claims being applied', async () => {
      soClient.find.mockResolvedValue({
        ...EMPTY_FIND,
        total: 2,
        saved_objects: [
          { ...soWith(pendingAttrs({ expires_at: PAST })), id: 'old-1' },
          { ...soWith(pendingAttrs({ expires_at: PAST, status: 'received' })), id: 'old-2' },
        ] as any,
      });

      await create();

      expect(soClient.find).toHaveBeenCalledWith({
        type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        filter: `${PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE}.attributes.expires_at < "${NOW.toISOString()}" and not ${PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE}.attributes.status: receiving`,
        perPage: 100,
      });
      expect(soClient.bulkDelete).toHaveBeenCalledWith([
        { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id: 'old-1' },
        { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id: 'old-2' },
      ]);
    });

    it('deletes nothing when no record has expired', async () => {
      await create();

      expect(soClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('still returns the new record when the sweep fails', async () => {
      soClient.find.mockRejectedValue(new Error('search down'));

      const { item, token } = await create();

      expect(item.id).toBe('cb-1');
      expect(token).toHaveLength(64);
      expect(logger.warn).toHaveBeenCalledWith(
        'Could not delete expired provisioning callbacks: search down'
      );
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

    it('strips the token hash from the item', async () => {
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

    it('never writes, even for a stale claim', async () => {
      soClient.get.mockResolvedValue(soWith(CLAIMED));

      const item = await provisioningCallbackService.get(soClient, 'cb-1');

      expect(item).toMatchObject({ status: 'receiving', ...PAYLOAD });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });
  });

  describe('poll', () => {
    const poll = (spaceId = 'default') =>
      provisioningCallbackService.poll(soClient, 'cb-1', spaceId);

    it('returns undefined for an unknown id', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );
      expect(await poll()).toBeUndefined();
    });

    it('returns undefined for a record of another space, without applying anything it holds', async () => {
      soClient.get.mockResolvedValue(soWith(CLAIMED));

      expect(await poll('marketing')).toBeUndefined();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });

    it('returns a pending record as is', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs()));

      expect(await poll()).toMatchObject({ status: 'pending' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('leaves a fresh claim to the request holding it', async () => {
      soClient.get.mockResolvedValue(soWith(CLAIMED, FRESH) as any);

      expect(await poll()).toMatchObject({ status: 'receiving', ...PAYLOAD });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });

    it('leaves an expired record alone', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs({ expires_at: PAST, ...PAYLOAD })));

      expect(await poll()).toMatchObject({ status: 'pending' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('applies the stored report of a stale claim, so the browser poll recovers a dead request', async () => {
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(CLAIMED);
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update.mockResolvedValue({ version: 'v2' } as any);

      const item = await poll();

      // Taken over with a guarded write of its own, applied, and finished under that version.
      expect(soClient.update).toHaveBeenNthCalledWith(
        1,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        CLAIM,
        { version: 'v1' }
      );
      expect(cloudConnectorService.create).toHaveBeenCalledWith(
        soClient,
        expect.objectContaining({ vars: { role_arn: { type: 'text', value: ROLE_ARN } } }),
        { id: 'cb-1' }
      );
      expect(soClient.update).toHaveBeenNthCalledWith(
        2,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        expect.objectContaining({ status: 'received', cloud_connector_id: 'cc-1' }),
        { version: 'v2' }
      );
      expect(item).toMatchObject({ status: 'received', cloud_connector_id: 'cc-1', ...PAYLOAD });
    });

    it('hands the record back pending when the stored report cannot be applied', async () => {
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(CLAIMED);
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update.mockResolvedValue({ version: 'v2' } as any);
      jest
        .mocked(cloudConnectorService.create)
        .mockRejectedValue(new CloudConnectorCreateError('boom'));

      const item = await poll();

      expect(soClient.update).toHaveBeenLastCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        { status: 'pending' },
        { version: 'v2' }
      );
      expect(item).toMatchObject({ status: 'pending', ...PAYLOAD });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Could not apply the stored report of provisioning callback \[id=cb-1\]: .*boom$/
        )
      );
    });

    it('returns what another attempt stored when the takeover loses', async () => {
      soClient.get
        .mockResolvedValueOnce(soWith(CLAIMED))
        .mockResolvedValueOnce(soWith(CLAIMED, FRESH) as any);
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );

      const item = await poll();

      expect(item).toMatchObject({ status: 'receiving' });
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });

    it('retries a report that was released back to pending once it is stale', async () => {
      // A failed creation hands the record back pending with its values kept.
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(pendingAttrs(PAYLOAD));
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update.mockResolvedValue({ version: 'v2' } as any);

      const item = await poll();

      expect(cloudConnectorService.create).toHaveBeenCalledTimes(1);
      expect(item).toMatchObject({ status: 'received', cloud_connector_id: 'cc-1' });
    });

    it('does not retry a released report that was just released', async () => {
      soClient.get.mockResolvedValue(soWith(pendingAttrs(PAYLOAD), FRESH) as any);

      expect(await poll()).toMatchObject({ status: 'pending' });
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
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
        token: TOKEN,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is not_found when the token is not the one bound to the record, and audit-logs the rejection without the token', async () => {
      mockRecord(pendingAttrs());
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: OTHER_TOKEN,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledTimes(1);
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'Provisioning callback report rejected: unknown record or token',
        event: {
          action: 'provisioning_callback_report',
          category: ['web'],
          type: ['denied'],
          outcome: 'failure',
        },
      });
      // Nothing the caller sent is written: not the token, not the id, not the ARNs.
      const written = JSON.stringify(mockedAudit.writeCustomAuditLog.mock.calls);
      expect(written).not.toContain(OTHER_TOKEN);
      expect(written).not.toContain('cb-1');
      expect(written).not.toContain(ROLE_ARN);
    });

    it('is not_found when no token was presented', async () => {
      mockRecord(pendingAttrs());
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: undefined,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is not_found when the record was altered under its hash', async () => {
      // The token was minted for another expiry; the hash no longer matches this record.
      mockRecord(pendingAttrs({ expires_at: '2026-10-13T13:00:00.000Z' }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'not_found' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is gone for an expired pending record', async () => {
      const expired = pendingAttrs({ expires_at: PAST });
      const { token, tokenHash } = mintFor(expired);
      mockRecord({ ...expired, token_hash: tokenHash });
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'gone' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is gone for a cancelled record, and audit-logs it', async () => {
      mockRecord(pendingAttrs({ status: 'cancelled' }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });
      expect(result).toEqual({ outcome: 'gone' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'Provisioning callback report rejected: record expired or cancelled',
        event: {
          action: 'provisioning_callback_report',
          category: ['web'],
          type: ['denied'],
          outcome: 'failure',
        },
        kibana: { saved_object: { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id: 'cb-1' } },
        labels: { role_arn: ROLE_ARN, stack_arn: STACK_ARN },
      });
    });

    it('is invalid when the role ARN and the stack ARN are in different accounts', async () => {
      mockRecord(pendingAttrs());
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::999999999999:role/other' },
      });
      expect(result).toEqual({
        outcome: 'invalid',
        message: 'role_arn and stack_arn must be in the same AWS account',
      });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('claims the record, creates the connector under its id and audit-logs', async () => {
      mockRecord(pendingAttrs());

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
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
      // The finish is guarded by the claim's version, so it cannot land on a claim another
      // attempt has since taken over.
      expect(soClient.update).toHaveBeenNthCalledWith(
        2,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'ElasticWorkloadIdentity-abc',
          cloud_connector_id: 'cc-1',
        },
        { version: 'v2' }
      );
      // Two audit entries: the identity made from the record, and the report that led to it.
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'Provisioning callback received, cloud connector created',
        event: {
          action: 'provisioning_callback_received',
          category: ['database'],
          type: ['creation'],
          outcome: 'success',
        },
        kibana: { saved_object: { type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, id: 'cc-1' } },
        labels: { provisioning_callback_id: 'cb-1', role_arn: ROLE_ARN, stack_arn: STACK_ARN },
      });
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'Provisioning callback report accepted',
        event: {
          action: 'provisioning_callback_report',
          category: ['web'],
          type: ['change'],
          outcome: 'success',
        },
        kibana: { saved_object: { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id: 'cb-1' } },
        labels: { role_arn: ROLE_ARN, stack_arn: STACK_ARN },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Provisioning callback received [id=cb-1] [cloud_connector_id=cc-1]'
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
        token: TOKEN,
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
        token: TOKEN,
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
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({
        outcome: 'conflict',
        item: { status: 'receiving', ...other },
      });
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledTimes(1);
    });

    it('takes over a stale claim and finishes it when its connector already exists', async () => {
      // A previous attempt created the connector but died before marking the record received.
      mockRecord(CLAIMED, { name: 'my-identity' });

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(cloudConnectorService.create).not.toHaveBeenCalled();
      // The takeover is a guarded write of its own, so the dead attempt's version is retired
      // and nothing it might still do can touch the record.
      expect(soClient.update).toHaveBeenNthCalledWith(
        1,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        CLAIM,
        { version: 'v1' }
      );
      expect(soClient.update).toHaveBeenNthCalledWith(
        2,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'my-identity',
          cloud_connector_id: 'cb-1',
        },
        { version: 'v2' }
      );
      expect(result).toMatchObject({
        outcome: 'received',
        item: { status: 'received', cloud_connector_id: 'cb-1', connector_name: 'my-identity' },
      });
    });

    it('answers receiving without writes while a fresh claim is still applying the same report', async () => {
      soClient.get.mockResolvedValue(soWith(CLAIMED, FRESH) as any);

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({ outcome: 'receiving', item: { status: 'receiving' } });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });

    it('answers receiving when it loses the claim to a concurrent copy of the same report', async () => {
      soClient.get
        .mockResolvedValueOnce(soWith(pendingAttrs()))
        .mockResolvedValueOnce(soWith(CLAIMED, FRESH) as any);
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({ outcome: 'receiving', item: { status: 'receiving' } });
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledTimes(1);
    });

    it('answers receiving when another retry takes a stale claim over first', async () => {
      soClient.get
        .mockResolvedValueOnce(soWith(CLAIMED))
        .mockResolvedValueOnce(soWith(CLAIMED, FRESH) as any);
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({ outcome: 'receiving', item: { status: 'receiving' } });
      expect(cloudConnectorService.create).not.toHaveBeenCalled();
    });

    it('returns what the attempt that took the claim over stored when its own finish loses', async () => {
      const finished = pendingAttrs({
        status: 'received',
        ...PAYLOAD,
        cloud_connector_id: 'cc-1',
        connector_name: 'ElasticWorkloadIdentity-abc',
      });
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soClient.get.mock.calls.length > 1 ? soWith(finished) : soWith(pendingAttrs());
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update
        .mockResolvedValueOnce({ version: 'v2' } as any)
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
            'cb-1'
          )
        );

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(result).toMatchObject({
        outcome: 'received',
        item: { status: 'received', cloud_connector_id: 'cc-1' },
      });
    });

    it('marks the record received over a cancel that landed while the connector was being made', async () => {
      const cancelled = pendingAttrs({ status: 'cancelled', ...PAYLOAD, expires_at: PAST });
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soClient.get.mock.calls.length > 1 ? soWith(cancelled) : soWith(pendingAttrs());
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update
        .mockResolvedValueOnce({ version: 'v2' } as any)
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
            'cb-1'
          )
        )
        .mockResolvedValueOnce({} as any);

      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });

      expect(soClient.update).toHaveBeenCalledTimes(3);
      expect(soClient.update).toHaveBeenLastCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'ElasticWorkloadIdentity-abc',
          cloud_connector_id: 'cc-1',
        }
      );
      expect(result).toMatchObject({
        outcome: 'received',
        item: { status: 'received', cloud_connector_id: 'cc-1' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Provisioning callback [id=cb-1] was cancelled while its identity was being created; marking it received [cloud_connector_id=cc-1]'
      );
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
        token: TOKEN,
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
          token: TOKEN,
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
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'Provisioning callback report could not be applied',
        event: {
          action: 'provisioning_callback_report',
          category: ['web'],
          type: ['error'],
          outcome: 'failure',
        },
        kibana: { saved_object: { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id: 'cb-1' } },
        labels: { role_arn: ROLE_ARN, stack_arn: STACK_ARN },
        error: { message: 'Error creating cloud connector in Fleet, boom' },
      });
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
          token: TOKEN,
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
          token: TOKEN,
          payload: PAYLOAD,
        })
      ).rejects.toThrow('boom');
    });

    it('is a conflict when a different payload arrives while the first is being applied', async () => {
      mockRecord(CLAIMED);
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::123456789012:role/another' },
      });
      expect(result).toMatchObject({ outcome: 'conflict' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is idempotent: the same payload after received is received again without writes', async () => {
      mockRecord(pendingAttrs({ status: 'received', received_at: PAST, ...PAYLOAD }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: PAYLOAD,
      });
      expect(result).toMatchObject({ outcome: 'received' });
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('is a conflict when a different payload arrives after received, and audit-logs the values it refused', async () => {
      mockRecord(pendingAttrs({ status: 'received', received_at: PAST, ...PAYLOAD }));
      const result = await provisioningCallbackService.receive(soClient, 'cb-1', {
        token: TOKEN,
        payload: { ...PAYLOAD, role_arn: 'arn:aws:iam::123456789012:role/another' },
      });
      expect(result).toMatchObject({ outcome: 'conflict' });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'Provisioning callback report rejected: different values already received',
        event: {
          action: 'provisioning_callback_report',
          category: ['web'],
          type: ['denied'],
          outcome: 'failure',
        },
        kibana: { saved_object: { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id: 'cb-1' } },
        labels: { role_arn: 'arn:aws:iam::123456789012:role/another', stack_arn: STACK_ARN },
      });
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

    it('marks a pending record cancelled and audit-logs', async () => {
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
      expect(mockedAudit.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'User cancelling provisioning callback [id=cb-1]',
      });
      expect(item).toMatchObject({ id: 'cb-1', status: 'cancelled' });
      expect(item).not.toHaveProperty('token_hash');
    });

    it.each(['received', 'cancelled'] as const)('leaves a %s record as it is', async (status) => {
      soClient.get.mockResolvedValue(
        soWith(pendingAttrs({ status, ...PAYLOAD, cloud_connector_id: 'cb-1' }))
      );

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).not.toHaveBeenCalled();
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
      expect(item).toMatchObject({ status: 'receiving', ...PAYLOAD });
    });

    it('retires a claim nobody is applying any more once the record has expired', async () => {
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(pendingAttrs({ ...CLAIM, expires_at: PAST }));
        }
        throw CONNECTOR_NOT_FOUND;
      });
      soClient.update.mockResolvedValue({} as any);

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).toHaveBeenCalledWith(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        { status: 'cancelled' },
        { version: 'v1' }
      );
      expect(item).toMatchObject({ status: 'cancelled', ...PAYLOAD });
      expect(logger.warn).toHaveBeenCalledWith(
        'Provisioning callback [id=cb-1] expired while its report was being applied; no identity was created for it'
      );
    });

    it('reports the identity when its connector lands while the abandoned claim is being cancelled', async () => {
      let connectorLookups = 0;
      soClient.get.mockImplementation(async (type, id) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(pendingAttrs({ ...CLAIM, expires_at: PAST }));
        }
        connectorLookups += 1;
        if (connectorLookups === 1) {
          throw CONNECTOR_NOT_FOUND;
        }
        return { id, type, references: [], attributes: { name: 'my-identity' } } as any;
      });
      soClient.update.mockResolvedValueOnce({ version: 'v2' } as any).mockResolvedValue({} as any);

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).toHaveBeenNthCalledWith(
        1,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        { status: 'cancelled' },
        { version: 'v1' }
      );
      // Guarded by the cancelled write, so a report that marked it received first is not redone.
      expect(soClient.update).toHaveBeenNthCalledWith(
        2,
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        'cb-1',
        {
          status: 'received',
          received_at: NOW.toISOString(),
          connector_name: 'my-identity',
          cloud_connector_id: 'cb-1',
        },
        { version: 'v2' }
      );
      expect(item).toMatchObject({ status: 'received', cloud_connector_id: 'cb-1' });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(mockedAudit.writeCustomAuditLog).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User cancelling provisioning callback [id=cb-1]' })
      );
    });

    it('leaves a fresh claim on an expired record to the request holding it', async () => {
      soClient.get.mockImplementation(async (type) => {
        if (type === PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE) {
          return soWith(pendingAttrs({ ...CLAIM, expires_at: PAST }), FRESH);
        }
        throw CONNECTOR_NOT_FOUND;
      });

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(soClient.update).not.toHaveBeenCalled();
      expect(item).toMatchObject({ status: 'receiving', ...PAYLOAD });
    });

    it('hands back what a takeover stored when retiring an abandoned claim loses to it', async () => {
      const takenOver = pendingAttrs({
        status: 'received',
        ...PAYLOAD,
        cloud_connector_id: 'cb-1',
        expires_at: PAST,
      });
      soClient.get
        .mockResolvedValueOnce(soWith(pendingAttrs({ ...CLAIM, expires_at: PAST })))
        .mockRejectedValueOnce(CONNECTOR_NOT_FOUND)
        .mockResolvedValueOnce(soWith(takenOver));
      soClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
          'cb-1'
        )
      );

      const item = await provisioningCallbackService.cancel(soClient, 'cb-1');

      expect(item).toMatchObject({ status: 'received', cloud_connector_id: 'cb-1' });
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

      expect(item).toMatchObject({ status: 'receiving', ...PAYLOAD });
    });
  });
});

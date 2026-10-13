/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { IAC_CALLBACK_SAVED_OBJECT_TYPE } from '../../common/constants';
import type {
  IacCallback,
  IacCallbackReceivedValues,
} from '../../common/types/models/iac_callback';
import type { IacCallbackSOAttributes } from '../types/so_attributes';
import { FleetError } from '../errors';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { invalidateAPIKeys } from './api_keys/security';

/** How long the stack has to call back. Also the lifetime of the key bound to the record. */
export const IAC_CALLBACK_EXPIRATION = '2h';
export const IAC_CALLBACK_TTL_MS = 2 * 60 * 60 * 1000;

export interface CreateIacCallbackOptions {
  provider: 'aws';
  createdBy?: string;
  spaceId?: string;
}

export interface IacCallbackReceiveInput {
  /** Id of the API key the caller authenticated with; undefined for any other authentication. */
  apiKeyId: string | undefined;
  payload: IacCallbackReceivedValues;
}

export type IacCallbackReceiveResult =
  /** Stored now, or an exact replay of what is already stored. */
  | { outcome: 'received'; item: IacCallback }
  /** No such record, or the caller's key is not the one bound to it. Indistinguishable on purpose. */
  | { outcome: 'not_found' }
  /** A different payload arrived after the record was already received. */
  | { outcome: 'conflict'; item: IacCallback }
  /** Cancelled, or past its expiry. */
  | { outcome: 'gone' }
  /** Fields are individually well-formed but disagree with each other. */
  | { outcome: 'invalid'; message: string };

const RECEIVED_FIELDS: Array<keyof IacCallbackReceivedValues> = [
  'role_arn',
  'stack_arn',
  'aws_account_id',
  'region',
];

const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

const toItem = (id: string, attributes: IacCallbackSOAttributes): IacCallback => {
  // Never hand the key id out: a caller that knows it has nothing to gain, and the only
  // legitimate use (matching the receiving key) stays inside this service.
  const { api_key_id: _apiKeyId, ...rest } = attributes;
  return { id, ...rest };
};

const isSamePayload = (
  stored: IacCallbackSOAttributes,
  payload: IacCallbackReceivedValues
): boolean => RECEIVED_FIELDS.every((field) => stored[field] === payload[field]);

class IacCallbackService {
  private get logger() {
    return appContextService.getLogger().get('iacCallback');
  }

  /**
   * Creates a pending record and a zero-privilege key bound to it. The encoded key is returned
   * exactly once and never stored; only its id is, so it can be matched and invalidated.
   */
  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    { provider, createdBy, spaceId }: CreateIacCallbackOptions
  ): Promise<{ item: IacCallback; apiKey: string }> {
    const id = uuidv4();
    const now = new Date();

    const key = await esClient.security
      .createApiKey({
        name: `fleet-iac-callback-${id}`,
        expiration: IAC_CALLBACK_EXPIRATION,
        metadata: { managed_by: 'fleet', managed: true, type: 'iac_callback', callback_id: id },
        role_descriptors: {
          // Named descriptor with no privileges. An empty `role_descriptors: {}` would inherit
          // the creating user's privileges instead.
          'fleet-apikey-iac-callback': {
            cluster: [],
            index: [],
            applications: [
              { application: 'fleet', privileges: ['no-privileges'], resources: ['*'] },
            ],
          },
        },
      })
      .catch((err) => {
        throw new FleetError(`Impossible to create an api key: ${err.message}`);
      });

    const attributes: IacCallbackSOAttributes = {
      provider,
      status: 'pending',
      api_key_id: key.id,
      created_at: now.toISOString(),
      ...(createdBy ? { created_by: createdBy } : {}),
      ...(spaceId ? { space_id: spaceId } : {}),
      expires_at: new Date(key.expiration ?? now.getTime() + IAC_CALLBACK_TTL_MS).toISOString(),
    };

    auditLoggingService.writeCustomAuditLog({
      message: `User creating IaC callback [id=${id}] [api_key_id=${key.id}]`,
    });

    const so = await soClient.create<IacCallbackSOAttributes>(
      IAC_CALLBACK_SAVED_OBJECT_TYPE,
      attributes,
      { id }
    );

    return {
      item: toItem(so.id, so.attributes),
      apiKey: Buffer.from(`${key.id}:${key.api_key}`).toString('base64'),
    };
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<IacCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    return so ? toItem(so.id, so.attributes) : undefined;
  }

  /**
   * Applies what the stack's Lambda reported. The caller must present the key bound to the
   * record; anything else looks like a missing record so an attacker learns nothing.
   */
  public async receive(
    soClient: SavedObjectsClientContract,
    id: string,
    { apiKeyId, payload }: IacCallbackReceiveInput
  ): Promise<IacCallbackReceiveResult> {
    const so = await this.getSavedObject(soClient, id);
    if (!so || !apiKeyId || so.attributes.api_key_id !== apiKeyId) {
      return { outcome: 'not_found' };
    }
    const { attributes } = so;

    if (attributes.status === 'cancelled') {
      return { outcome: 'gone' };
    }
    if (
      attributes.status === 'pending' &&
      new Date(attributes.expires_at).getTime() <= Date.now()
    ) {
      // The key's own expiry matches, but make sure a clock skew cannot keep it usable.
      await invalidateAPIKeys([attributes.api_key_id]);
      return { outcome: 'gone' };
    }

    const accountId = payload.aws_account_id;
    if (
      accountIdOfArn(payload.role_arn) !== accountId ||
      accountIdOfArn(payload.stack_arn) !== accountId
    ) {
      return {
        outcome: 'invalid',
        message: 'aws_account_id must match the account of role_arn and stack_arn',
      };
    }

    if (attributes.status === 'received') {
      // A Lambda retry after a timed-out success must not fail the stack; a different answer
      // for the same record is a real conflict.
      return isSamePayload(attributes, payload)
        ? { outcome: 'received', item: toItem(so.id, attributes) }
        : { outcome: 'conflict', item: toItem(so.id, attributes) };
    }

    const update: Partial<IacCallbackSOAttributes> = {
      status: 'received',
      received_at: new Date().toISOString(),
      role_arn: payload.role_arn,
      stack_arn: payload.stack_arn,
      aws_account_id: payload.aws_account_id,
      region: payload.region,
    };
    await soClient.update<IacCallbackSOAttributes>(IAC_CALLBACK_SAVED_OBJECT_TYPE, so.id, update);

    // Single use: the key dies with the first successful receive.
    await invalidateAPIKeys([attributes.api_key_id]);

    auditLoggingService.writeCustomAuditLog({
      message: `IaC callback received [id=${so.id}] [api_key_id=${attributes.api_key_id}] [role_arn=${payload.role_arn}] [aws_account_id=${payload.aws_account_id}]`,
    });
    this.logger.debug(`IaC callback received [id=${so.id}]`);

    return { outcome: 'received', item: toItem(so.id, { ...attributes, ...update }) };
  }

  /** Marks the record cancelled and kills its key, whatever state it was in. */
  public async cancel(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<IacCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    if (!so) {
      return undefined;
    }
    const update: Partial<IacCallbackSOAttributes> = { status: 'cancelled' };
    await soClient.update<IacCallbackSOAttributes>(IAC_CALLBACK_SAVED_OBJECT_TYPE, so.id, update);
    await invalidateAPIKeys([so.attributes.api_key_id]);

    auditLoggingService.writeCustomAuditLog({
      message: `User cancelling IaC callback [id=${so.id}] [api_key_id=${so.attributes.api_key_id}]`,
    });

    return toItem(so.id, { ...so.attributes, ...update });
  }

  private async getSavedObject(soClient: SavedObjectsClientContract, id: string) {
    try {
      return await soClient.get<IacCallbackSOAttributes>(IAC_CALLBACK_SAVED_OBJECT_TYPE, id);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }
}

export const iacCallbackService = new IacCallbackService();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  IAC_CALLBACK_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  IacCallback,
  IacCallbackIdentity,
  IacCallbackReceivedValues,
} from '../../common/types/models/iac_callback';
import type { CloudConnectorIacState } from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes, IacCallbackSOAttributes } from '../types/so_attributes';
import { CloudConnectorCreateError, FleetError } from '../errors';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { invalidateAPIKeys } from './api_keys/security';
import { cloudConnectorService } from './cloud_connector';

/** How long the stack has to call back. Also the lifetime of the key bound to the record. */
export const IAC_CALLBACK_EXPIRATION = '2h';
export const IAC_CALLBACK_TTL_MS = 2 * 60 * 60 * 1000;

export interface CreateIacCallbackOptions {
  provider: 'aws';
  createdBy?: string;
  spaceId?: string;
  /** Name, account type and template details for the cloud connector created when the stack reports back. */
  identity?: IacCallbackIdentity;
}

const IDENTITY_FIELDS: Array<keyof IacCallbackIdentity> = [
  'connector_name',
  'account_type',
  'iac_key',
  'iac_blueprint_id',
  'iac_blueprint_version',
];

const CONNECTOR_NAME_MAX_LENGTH = 255;

/** Last path segment of an IAM role ARN, used when the browser has not named the identity yet. */
const roleNameFromArn = (roleArn: string): string => {
  const resource = roleArn.split(':role/')[1] ?? '';
  const name = resource.split('/').pop()?.trim() ?? '';
  return name.slice(0, CONNECTOR_NAME_MAX_LENGTH) || 'aws-workload-identity';
};

const isDuplicateName = (error: unknown): boolean =>
  error instanceof CloudConnectorCreateError && error.message.includes('already exists');

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
  /** Past its expiry, or cancelled by the browser. */
  | { outcome: 'gone' }
  /** Fields are individually well-formed but disagree with each other. */
  | { outcome: 'invalid'; message: string };

const RECEIVED_FIELDS: Array<keyof IacCallbackReceivedValues> = ['role_arn', 'stack_arn'];

const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

const toItem = (id: string, attributes: IacCallbackSOAttributes): IacCallback => {
  // The API key id never leaves this service.
  const { api_key_id: _apiKeyId, ...rest } = attributes;
  return { id, ...rest };
};

const isSamePayload = (
  stored: IacCallbackSOAttributes,
  payload: IacCallbackReceivedValues
): boolean => RECEIVED_FIELDS.every((field) => stored[field] === payload[field]);

interface CreatedCloudConnector {
  id: string;
  name: string;
}

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
    { provider, createdBy, spaceId, identity = {} }: CreateIacCallbackOptions
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
    for (const field of IDENTITY_FIELDS) {
      if (identity[field] !== undefined) {
        Object.assign(attributes, { [field]: identity[field] });
      }
    }

    auditLoggingService.writeCustomAuditLog({
      message: `User creating IaC callback [id=${id}] [api_key_id=${key.id}]`,
    });

    const so = await soClient.create<IacCallbackSOAttributes>(
      IAC_CALLBACK_SAVED_OBJECT_TYPE,
      attributes,
      { id }
    );
    this.logger.info(
      `IaC callback created [id=${id}] [space_id=${spaceId ?? 'default'}] [expires_at=${
        attributes.expires_at
      }]`
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
   * Applies the stack's report. A caller without the record's own key gets the same answer as
   * for a missing record.
   *
   * The report is claimed with a version-guarded update before the cloud connector is created,
   * and the connector takes the record's id, so concurrent or retried reports converge on one
   * identity: a second report either loses the claim and is judged against the stored values,
   * or finds the connector the first one created.
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

    if (accountIdOfArn(payload.role_arn) !== accountIdOfArn(payload.stack_arn)) {
      return {
        outcome: 'invalid',
        message: 'role_arn and stack_arn must be in the same AWS account',
      };
    }

    let { attributes, version } = so;
    if (attributes.status === 'pending') {
      if (new Date(attributes.expires_at).getTime() <= Date.now()) {
        // The key expires at the same time; invalidate it anyway in case the clocks differ.
        await invalidateAPIKeys([attributes.api_key_id]);
        return { outcome: 'gone' };
      }
      const claimed = await this.claim(soClient, so, payload);
      if (!claimed) {
        return { outcome: 'not_found' };
      }
      attributes = claimed.attributes;
      version = claimed.version;
    }

    if (attributes.status === 'cancelled') {
      return { outcome: 'gone' };
    }

    if (!isSamePayload(attributes, payload)) {
      // A different report is a conflict, whether the first one has finished or not.
      return { outcome: 'conflict', item: toItem(so.id, attributes) };
    }

    if (attributes.status === 'received') {
      // A retry of the same report gets the same result.
      return { outcome: 'received', item: toItem(so.id, attributes) };
    }

    let connector: CreatedCloudConnector;
    try {
      connector = await this.ensureCloudConnector(so.id, attributes, payload);
    } catch (error) {
      // No identity was made. Hand the record back so a retry of the report, or a cancel from
      // the browser, is not stuck behind a claim nobody is applying.
      await this.releaseClaim(soClient, so.id, version);
      throw error;
    }

    const item = await this.finish(soClient, so.id, attributes, connector);
    this.logger.info(`IaC callback received [id=${so.id}] [cloud_connector_id=${connector.id}]`);
    return { outcome: 'received', item };
  }

  /** Marks the record received for the connector made from it and kills the key. */
  private async finish(
    soClient: SavedObjectsClientContract,
    id: string,
    attributes: IacCallbackSOAttributes,
    connector: CreatedCloudConnector
  ): Promise<IacCallback> {
    const update: Partial<IacCallbackSOAttributes> = {
      status: 'received',
      received_at: new Date().toISOString(),
      connector_name: connector.name,
      cloud_connector_id: connector.id,
    };
    await soClient.update<IacCallbackSOAttributes>(IAC_CALLBACK_SAVED_OBJECT_TYPE, id, update);

    // The key is single use.
    await invalidateAPIKeys([attributes.api_key_id]);

    auditLoggingService.writeCustomAuditLog({
      message: `IaC callback received [id=${id}] [api_key_id=${attributes.api_key_id}] [cloud_connector_id=${connector.id}] [role_arn=${attributes.role_arn}]`,
    });

    return toItem(id, { ...attributes, ...update });
  }

  /**
   * Puts the record back to pending, but only if it is still as this attempt last saw it: a
   * concurrent attempt with the same report may have finished it in the meantime, and its
   * progress must not be rolled back.
   */
  private async releaseClaim(
    soClient: SavedObjectsClientContract,
    id: string,
    version: string | undefined
  ): Promise<void> {
    try {
      await soClient.update<IacCallbackSOAttributes>(
        IAC_CALLBACK_SAVED_OBJECT_TYPE,
        id,
        { status: 'pending' },
        { version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        return;
      }
      this.logger.warn(
        `IaC callback [id=${id}] could not be released after a failed report: ${error.message}`
      );
    }
  }

  /**
   * Retires a record the browser no longer waits on and kills its key. A record the stack has
   * already reported to is returned as it is, so the caller can pick up the identity instead of
   * creating one by hand. A report that made its connector but never got marked received is
   * finished here.
   */
  public async cancel(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<IacCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    if (!so) {
      return undefined;
    }
    const { attributes, version } = so;
    if (attributes.status === 'receiving') {
      const spaceClient = appContextService.getInternalUserSOClientForSpaceId(attributes.space_id);
      const connector = await this.findCloudConnector(spaceClient, so.id);
      return connector
        ? this.finish(soClient, so.id, attributes, connector)
        : toItem(so.id, attributes);
    }
    if (attributes.status !== 'pending') {
      return toItem(so.id, attributes);
    }

    const update: Partial<IacCallbackSOAttributes> = { status: 'cancelled' };
    try {
      await soClient.update<IacCallbackSOAttributes>(
        IAC_CALLBACK_SAVED_OBJECT_TYPE,
        so.id,
        update,
        { version }
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      // A report claimed the record first; hand back what it is doing.
      const claimed = await this.getSavedObject(soClient, id);
      return claimed ? toItem(claimed.id, claimed.attributes) : undefined;
    }
    await invalidateAPIKeys([attributes.api_key_id]);
    this.logger.info(`IaC callback cancelled [id=${so.id}]`);

    auditLoggingService.writeCustomAuditLog({
      message: `User cancelling IaC callback [id=${so.id}] [api_key_id=${attributes.api_key_id}]`,
    });

    return toItem(so.id, { ...attributes, ...update });
  }

  /**
   * Moves a pending record to `receiving` with the reported values, guarded by the record's
   * version. When another request got there first, returns what it stored instead. The version
   * returned is the one this attempt last saw, for a guarded release later.
   */
  private async claim(
    soClient: SavedObjectsClientContract,
    so: SavedObject<IacCallbackSOAttributes>,
    payload: IacCallbackReceivedValues
  ): Promise<{ attributes: IacCallbackSOAttributes; version: string | undefined } | undefined> {
    const update: Partial<IacCallbackSOAttributes> = {
      status: 'receiving',
      role_arn: payload.role_arn,
      stack_arn: payload.stack_arn,
    };
    try {
      const updated = await soClient.update<IacCallbackSOAttributes>(
        IAC_CALLBACK_SAVED_OBJECT_TYPE,
        so.id,
        update,
        { version: so.version }
      );
      return { attributes: { ...so.attributes, ...update }, version: updated.version };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      const current = await this.getSavedObject(soClient, so.id);
      return current ? { attributes: current.attributes, version: current.version } : undefined;
    }
  }

  /**
   * The connector for this record, created if it does not exist yet. It takes the record's id,
   * so a retry after a failed finalisation, or a concurrent report, finds the one already made
   * instead of creating another.
   */
  private async ensureCloudConnector(
    callbackId: string,
    attributes: IacCallbackSOAttributes,
    payload: IacCallbackReceivedValues
  ): Promise<CreatedCloudConnector> {
    const spaceClient = appContextService.getInternalUserSOClientForSpaceId(attributes.space_id);
    const existing = await this.findCloudConnector(spaceClient, callbackId);
    if (existing) {
      return existing;
    }
    try {
      return await this.createCloudConnector(spaceClient, callbackId, attributes, payload);
    } catch (error) {
      // A concurrent report may have created it between the lookup and the create.
      const created = await this.findCloudConnector(spaceClient, callbackId);
      if (created) {
        return created;
      }
      throw error;
    }
  }

  private async findCloudConnector(
    spaceClient: SavedObjectsClientContract,
    id: string
  ): Promise<CreatedCloudConnector | undefined> {
    try {
      const so = await spaceClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        id
      );
      return { id: so.id, name: so.attributes.name };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Creates the federated identity in the space the launch happened in, named after the stored
   * name or else the role. A taken name gets a short suffix, so the report still creates an
   * identity.
   */
  private async createCloudConnector(
    spaceClient: SavedObjectsClientContract,
    callbackId: string,
    attributes: IacCallbackSOAttributes,
    payload: IacCallbackReceivedValues
  ): Promise<CreatedCloudConnector> {
    const preferred =
      attributes.connector_name?.trim().slice(0, CONNECTOR_NAME_MAX_LENGTH) ||
      roleNameFromArn(payload.role_arn);

    const iac: CloudConnectorIacState = { iac_deployment_id: payload.stack_arn };
    if (attributes.iac_key !== undefined) {
      iac.iac_key = attributes.iac_key;
    }
    if (attributes.iac_blueprint_id !== undefined) {
      iac.iac_blueprint_id = attributes.iac_blueprint_id;
    }
    if (attributes.iac_blueprint_version !== undefined) {
      iac.iac_blueprint_version = attributes.iac_blueprint_version;
    }

    const create = (name: string) =>
      cloudConnectorService.create(
        spaceClient,
        {
          name,
          cloudProvider: 'aws',
          ...(attributes.account_type ? { accountType: attributes.account_type } : {}),
          vars: { role_arn: { type: 'text', value: payload.role_arn } },
          ...iac,
        },
        { id: callbackId }
      );

    try {
      return await create(preferred);
    } catch (error) {
      if (!isDuplicateName(error)) {
        throw error;
      }
      const suffix = ` ${callbackId.slice(0, 8)}`;
      return create(`${preferred.slice(0, CONNECTOR_NAME_MAX_LENGTH - suffix.length)}${suffix}`);
    }
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

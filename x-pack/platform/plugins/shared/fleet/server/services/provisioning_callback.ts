/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  CloudConnectorCallback,
  CloudConnectorCallbackIdentity,
  CloudConnectorCallbackReceivedValues,
} from '../../common/types/models/provisioning_callback';
import type { CloudConnectorIacState } from '../../common/types/models/cloud_connector';
import type {
  CloudConnectorSOAttributes,
  ProvisioningCallbackSOAttributes,
} from '../types/so_attributes';
import { CloudConnectorCreateError } from '../errors';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { cloudConnectorService } from './cloud_connector';
import {
  isProvisioningCallbackTokenValid,
  mintProvisioningCallbackToken,
} from './provisioning_callback_token';

/** How long the stack has to call back. Also the lifetime of the token bound to the record. */
export const PROVISIONING_CALLBACK_TTL_MS = 2 * 60 * 60 * 1000;

export interface CreateProvisioningCallbackOptions {
  provider: 'aws';
  createdBy?: string;
  spaceId?: string;
  /** Name, account type and template details for the cloud connector created when the stack reports back. */
  identity?: CloudConnectorCallbackIdentity;
}

const IDENTITY_FIELDS: Array<keyof CloudConnectorCallbackIdentity> = [
  'connector_name',
  'account_type',
  'iac_key',
  'iac_blueprint_id',
  'iac_blueprint_version',
  'onboarding_deployment_id',
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

export interface ProvisioningCallbackReceiveInput {
  /** The token the caller presented; undefined when it sent none. */
  token: string | undefined;
  payload: CloudConnectorCallbackReceivedValues;
}

export type ProvisioningCallbackReceiveResult =
  /** Stored now, or an exact replay of what is already stored. */
  | { outcome: 'received'; item: CloudConnectorCallback }
  /** No such record, or the caller's token is not the one bound to it. Indistinguishable on purpose. */
  | { outcome: 'not_found' }
  /** A different payload arrived after the record was already received. */
  | { outcome: 'conflict'; item: CloudConnectorCallback }
  /** Past its expiry, or cancelled by the browser. */
  | { outcome: 'gone' }
  /** Fields are individually well-formed but disagree with each other. */
  | { outcome: 'invalid'; message: string };

const RECEIVED_FIELDS: Array<keyof CloudConnectorCallbackReceivedValues> = [
  'role_arn',
  'stack_arn',
];

const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

const toItem = (
  id: string,
  attributes: ProvisioningCallbackSOAttributes
): CloudConnectorCallback => {
  // The token hash never leaves this service.
  const { token_hash: _tokenHash, ...rest } = attributes;
  return { id, ...rest };
};

const isSamePayload = (
  stored: ProvisioningCallbackSOAttributes,
  payload: CloudConnectorCallbackReceivedValues
): boolean => RECEIVED_FIELDS.every((field) => stored[field] === payload[field]);

interface CreatedCloudConnector {
  id: string;
  name: string;
}

class ProvisioningCallbackService {
  private get logger() {
    return appContextService.getLogger().get('provisioningCallback');
  }

  /**
   * Creates a pending record and the token that lets the stack report to it. The token is not a
   * credential of any kind: it is random, bound to this record, its space and its expiry, and
   * only its keyed hash is stored. It is returned exactly once and never logged.
   */
  public async create(
    soClient: SavedObjectsClientContract,
    { provider, createdBy, spaceId, identity = {} }: CreateProvisioningCallbackOptions
  ): Promise<{ item: CloudConnectorCallback; token: string }> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROVISIONING_CALLBACK_TTL_MS).toISOString();
    const { token, tokenHash } = mintProvisioningCallbackToken({
      callbackId: id,
      spaceId,
      expiresAt,
    });

    const attributes: ProvisioningCallbackSOAttributes = {
      provider,
      status: 'pending',
      token_hash: tokenHash,
      created_at: now.toISOString(),
      ...(createdBy ? { created_by: createdBy } : {}),
      ...(spaceId ? { space_id: spaceId } : {}),
      expires_at: expiresAt,
    };
    for (const field of IDENTITY_FIELDS) {
      if (identity[field] !== undefined) {
        Object.assign(attributes, { [field]: identity[field] });
      }
    }
    if (identity.onboarding_deployment_id) {
      // The deploy waits for the report; the executor moves it on from here.
      attributes.deploy_status = 'pending';
    }

    auditLoggingService.writeCustomAuditLog({
      message: `User creating provisioning callback [id=${id}]`,
    });

    const so = await soClient.create<ProvisioningCallbackSOAttributes>(
      PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
      attributes,
      { id }
    );
    this.logger.info(
      `Provisioning callback created [id=${id}] [space_id=${spaceId ?? 'default'}] [expires_at=${
        attributes.expires_at
      }]`
    );

    return { item: toItem(so.id, so.attributes), token };
  }

  /** Moves the deploy stage on; only the deploy executor writes it. */
  public async updateDeployStage(
    soClient: SavedObjectsClientContract,
    id: string,
    stage: Pick<ProvisioningCallbackSOAttributes, 'deploy_status' | 'deploy_error'>
  ): Promise<void> {
    await soClient.update<ProvisioningCallbackSOAttributes>(
      PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
      id,
      stage
    );
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudConnectorCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    return so ? toItem(so.id, so.attributes) : undefined;
  }

  /**
   * Applies the stack's report. A caller without the record's own token gets the same answer as
   * for a missing record. The token is checked against the record as stored, so a record whose
   * id, space or expiry was altered rejects its own token.
   *
   * The report is claimed with a version-guarded update before the cloud connector is created,
   * and the connector takes the record's id, so concurrent or retried reports converge on one
   * identity: a second report either loses the claim and is judged against the stored values,
   * or finds the connector the first one created.
   */
  public async receive(
    soClient: SavedObjectsClientContract,
    id: string,
    { token, payload }: ProvisioningCallbackReceiveInput
  ): Promise<ProvisioningCallbackReceiveResult> {
    const so = await this.getSavedObject(soClient, id);
    if (
      !so ||
      !isProvisioningCallbackTokenValid(
        token,
        { callbackId: so.id, spaceId: so.attributes.space_id, expiresAt: so.attributes.expires_at },
        so.attributes.token_hash
      )
    ) {
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
    this.logger.info(
      `Provisioning callback received [id=${so.id}] [cloud_connector_id=${connector.id}]`
    );
    return { outcome: 'received', item };
  }

  /**
   * Marks the record received for the connector made from it. The token has nothing left to do
   * from here: a repeat of the same report is answered the same way, anything else is refused.
   */
  private async finish(
    soClient: SavedObjectsClientContract,
    id: string,
    attributes: ProvisioningCallbackSOAttributes,
    connector: CreatedCloudConnector
  ): Promise<CloudConnectorCallback> {
    const update: Partial<ProvisioningCallbackSOAttributes> = {
      status: 'received',
      received_at: new Date().toISOString(),
      connector_name: connector.name,
      cloud_connector_id: connector.id,
    };
    await soClient.update<ProvisioningCallbackSOAttributes>(
      PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
      id,
      update
    );

    auditLoggingService.writeCustomAuditLog({
      message: `Provisioning callback received [id=${id}] [cloud_connector_id=${connector.id}] [role_arn=${attributes.role_arn}]`,
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
      await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        id,
        { status: 'pending' },
        { version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        return;
      }
      this.logger.warn(
        `Provisioning callback [id=${id}] could not be released after a failed report: ${error.message}`
      );
    }
  }

  /**
   * Retires a record the browser no longer waits on, so its token is refused. A record the stack has
   * already reported to is returned as it is, so the caller can pick up the identity instead of
   * creating one by hand. A report that made its connector but never got marked received is
   * finished here.
   */
  public async cancel(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudConnectorCallback | undefined> {
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

    const update: Partial<ProvisioningCallbackSOAttributes> = { status: 'cancelled' };
    try {
      await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
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
    this.logger.info(`Provisioning callback cancelled [id=${so.id}]`);

    auditLoggingService.writeCustomAuditLog({
      message: `User cancelling provisioning callback [id=${so.id}]`,
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
    so: SavedObject<ProvisioningCallbackSOAttributes>,
    payload: CloudConnectorCallbackReceivedValues
  ): Promise<
    { attributes: ProvisioningCallbackSOAttributes; version: string | undefined } | undefined
  > {
    const update: Partial<ProvisioningCallbackSOAttributes> = {
      status: 'receiving',
      role_arn: payload.role_arn,
      stack_arn: payload.stack_arn,
    };
    try {
      const updated = await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
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
    attributes: ProvisioningCallbackSOAttributes,
    payload: CloudConnectorCallbackReceivedValues
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
    attributes: ProvisioningCallbackSOAttributes,
    payload: CloudConnectorCallbackReceivedValues
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
      return await soClient.get<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        id
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }
}

export const provisioningCallbackService = new ProvisioningCallbackService();

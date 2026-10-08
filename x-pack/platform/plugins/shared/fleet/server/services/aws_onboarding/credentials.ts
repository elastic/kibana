/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import { AWS_ONBOARDING_CREDENTIALS_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type {
  AwsOnboardingCredentialsPublic,
  PutAwsOnboardingCredentialsRequest,
} from '../../../common/types/rest_spec/aws_onboarding';
import { FleetError, FleetNotFoundError } from '../../errors';
import { appContextService } from '../app_context';

const CREDENTIALS_SO_ID = 'default';
export const DEFAULT_STACK_NAME_PREFIX = 'elastic-onboarding';

/** Stored shape. `secretAccessKey` is encrypted at rest by Encrypted Saved Objects. */
interface AwsOnboardingCredentialsSOAttributes {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  stackNamePrefix: string;
  /** ARN of the bootstrap stack that created the user; lets Kibana delete it with the credentials. */
  bootstrapStackArn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AwsOnboardingCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  stackNamePrefix: string;
  bootstrapStackArn?: string;
}

const maskAccessKeyId = (accessKeyId: string): string =>
  accessKeyId.length <= 8 ? '••••' : `${accessKeyId.slice(0, 4)}…${accessKeyId.slice(-4)}`;

export class AwsOnboardingCredentialsService {
  private esoClient?: EncryptedSavedObjectsClient;

  public start(esoClient: EncryptedSavedObjectsClient) {
    this.esoClient = esoClient;
  }

  private get soClient(): SavedObjectsClientContract {
    return appContextService.getSavedObjects().getUnsafeInternalClient({
      includedHiddenTypes: [AWS_ONBOARDING_CREDENTIALS_SAVED_OBJECT_TYPE],
    });
  }

  public async save(
    request: PutAwsOnboardingCredentialsRequest
  ): Promise<AwsOnboardingCredentialsPublic> {
    if (!appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt) {
      throw new FleetError(
        'Cannot store AWS onboarding credentials: xpack.encryptedSavedObjects.encryptionKey is not configured'
      );
    }
    const now = new Date().toISOString();
    const existing = await this.getPublic();
    const attributes: AwsOnboardingCredentialsSOAttributes = {
      accessKeyId: request.accessKeyId,
      secretAccessKey: request.secrets.secretAccessKey,
      region: request.region,
      stackNamePrefix: request.stackNamePrefix ?? DEFAULT_STACK_NAME_PREFIX,
      bootstrapStackArn: request.bootstrapStackArn,
      createdAt: existing.configured ? existing.createdAt ?? now : now,
      updatedAt: now,
    };
    // Encrypted transparently on write; the plaintext secret is not retained in memory beyond this call.
    await this.soClient.create<AwsOnboardingCredentialsSOAttributes>(
      AWS_ONBOARDING_CREDENTIALS_SAVED_OBJECT_TYPE,
      attributes,
      { id: CREDENTIALS_SO_ID, overwrite: true }
    );
    const { createdAt, ...publicView } = await this.getPublic();
    return publicView;
  }

  /** Non-secret view for the UI. The encrypted attribute is stripped by the SO client on regular reads. */
  public async getPublic(): Promise<AwsOnboardingCredentialsPublic & { createdAt?: string }> {
    try {
      const so = await this.soClient.get<AwsOnboardingCredentialsSOAttributes>(
        AWS_ONBOARDING_CREDENTIALS_SAVED_OBJECT_TYPE,
        CREDENTIALS_SO_ID
      );
      return {
        configured: true,
        accessKeyIdMasked: maskAccessKeyId(so.attributes.accessKeyId),
        region: so.attributes.region,
        stackNamePrefix: so.attributes.stackNamePrefix,
        bootstrapStackArn: so.attributes.bootstrapStackArn,
        createdAt: so.attributes.createdAt,
      };
    } catch (error) {
      if (error?.output?.statusCode === 404 || error?.statusCode === 404) {
        return { configured: false };
      }
      throw error;
    }
  }

  /** Server-side only: decrypted credentials for the CloudFormation client. Never exposed by a route. */
  public async getDecrypted(): Promise<AwsOnboardingCredentials> {
    if (!this.esoClient) {
      throw new FleetError('AWS onboarding credentials service is not started');
    }
    try {
      const so =
        await this.esoClient.getDecryptedAsInternalUser<AwsOnboardingCredentialsSOAttributes>(
          AWS_ONBOARDING_CREDENTIALS_SAVED_OBJECT_TYPE,
          CREDENTIALS_SO_ID
        );
      const { accessKeyId, secretAccessKey, region, stackNamePrefix, bootstrapStackArn } =
        so.attributes;
      return { accessKeyId, secretAccessKey, region, stackNamePrefix, bootstrapStackArn };
    } catch (error) {
      if (error?.output?.statusCode === 404 || error?.statusCode === 404) {
        throw new FleetNotFoundError('AWS onboarding credentials are not configured');
      }
      throw error;
    }
  }

  public async delete(): Promise<void> {
    try {
      await this.soClient.delete(AWS_ONBOARDING_CREDENTIALS_SAVED_OBJECT_TYPE, CREDENTIALS_SO_ID);
    } catch (error) {
      if (error?.output?.statusCode === 404 || error?.statusCode === 404) {
        return;
      }
      throw error;
    }
  }
}

export const awsOnboardingCredentialsService = new AwsOnboardingCredentialsService();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createHash, generateKeyPair } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import type { TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { ISavedObjectsRepository, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { buildConnectorPublicKeyUrls } from '../../common';
import {
  ACTION_SAVED_OBJECT_TYPE,
  CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import type { rawConnectorSigningKeySchemaV1 } from '../saved_objects/schemas/raw_connector_signing_key';

export type RawConnectorSigningKey = TypeOf<typeof rawConnectorSigningKeySchemaV1>;

export const NO_SIGNING_KEY_MESSAGE = i18n.translate(
  'xpack.actions.serverSideErrors.noConnectorSigningKey',
  {
    defaultMessage: 'This connector has no signing key. Create a new connector to get a key.',
  }
);

/** Returns the origin to publish keys under, or a 400 error when it cannot be used. */
export const getSigningKeyPublicBaseUrl = (publicBaseUrl: string | undefined): string => {
  const url = publicBaseUrl ? new URL(publicBaseUrl) : undefined;
  if (url?.protocol !== 'https:' || url.pathname !== '/') {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.signingKeyPublicBaseUrl', {
        defaultMessage:
          'This connector type publishes a public key. Set server.publicBaseUrl to the public HTTPS URL of Kibana, without a path.',
      })
    );
  }
  return url.origin;
};

export const createConnectorSigningKey = async ({
  unsecuredSavedObjectsClient,
  publicBaseUrl,
  spaceId,
  connectorTypeId,
  connectorId,
}: {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  publicBaseUrl: string | undefined;
  spaceId: string;
  connectorTypeId: string;
  connectorId: string;
}): Promise<void> => {
  const { issuer } = buildConnectorPublicKeyUrls({
    publicBaseUrl: getSigningKeyPublicBaseUrl(publicBaseUrl),
    spaceId,
    connectorTypeId,
    connectorId,
  });
  const { privateKey, publicKey } = await promisify(generateKeyPair)('rsa', {
    modulusLength: 2048,
  });
  const { n, e } = publicKey.export({ format: 'jwk' });
  if (!n || !e) throw new Error('The RSA public key has no modulus or exponent.');
  // RFC 7638 thumbprint: required members in lexicographic order.
  const kid = createHash('sha256')
    .update(JSON.stringify({ e, kty: 'RSA', n }))
    .digest('base64url');
  await unsecuredSavedObjectsClient.create<RawConnectorSigningKey>(
    CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
    {
      connectorId,
      spaceId,
      issuer,
      publicKey: { kty: 'RSA', n, e, kid, alg: 'RS256', use: 'sig' },
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: connectorId,
      overwrite: true,
      references: [{ name: 'connector', type: ACTION_SAVED_OBJECT_TYPE, id: connectorId }],
    }
  );
};

export const deleteConnectorSigningKey = async ({
  unsecuredSavedObjectsClient,
  connectorId,
}: {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  connectorId: string;
}): Promise<void> => {
  try {
    await unsecuredSavedObjectsClient.delete(CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE, connectorId);
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
  }
};

/**
 * Loads the public part of a connector's signing key, or undefined when the connector has no key
 * in this space.
 */
export const getConnectorPublicKey = async ({
  savedObjectsClient,
  connectorId,
  spaceId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  connectorId: string;
  spaceId: string;
}): Promise<Pick<RawConnectorSigningKey, 'issuer' | 'publicKey'> | undefined> => {
  try {
    const { attributes } = await savedObjectsClient.get<RawConnectorSigningKey>(
      CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
      connectorId
    );
    if (attributes.connectorId !== connectorId || attributes.spaceId !== spaceId) return undefined;
    const { kty, n, e, kid, alg, use } = attributes.publicKey;
    return { issuer: attributes.issuer, publicKey: { kty, n, e, kid, alg, use } };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) return undefined;
    throw error;
  }
};

const connectorExistsInSpace = async (
  savedObjectsRepository: ISavedObjectsRepository,
  connectorId: string,
  spaceId: string
): Promise<boolean> => {
  try {
    await savedObjectsRepository.get(ACTION_SAVED_OBJECT_TYPE, connectorId, {
      namespace: SavedObjectsUtils.namespaceStringToId(spaceId),
    });
    return true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) return false;
    throw error;
  }
};

/**
 * Signs claims with the connector's key. The key is loaded on each call, and is used only while its
 * connector exists in the key's space, so a key left by a deleted space is never reused.
 */
export const createConnectorJwtSigner =
  ({
    getEncryptedSavedObjectsClient,
    getSavedObjectsRepository,
    connectorId,
  }: {
    getEncryptedSavedObjectsClient: () => Promise<EncryptedSavedObjectsClient>;
    getSavedObjectsRepository: () => Promise<ISavedObjectsRepository>;
    connectorId: string;
  }) =>
  async (claims: Record<string, unknown>): Promise<string> => {
    const client = await getEncryptedSavedObjectsClient();
    const key = await client
      .getDecryptedAsInternalUser<RawConnectorSigningKey>(
        CONNECTOR_SIGNING_KEY_SAVED_OBJECT_TYPE,
        connectorId
      )
      .catch((error) => {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) return undefined;
        throw error;
      });
    if (key?.attributes.connectorId !== connectorId) throw new Error(NO_SIGNING_KEY_MESSAGE);
    const { spaceId, issuer, publicKey, privateKey } = key.attributes;
    if (!(await connectorExistsInSpace(await getSavedObjectsRepository(), connectorId, spaceId))) {
      throw new Error(NO_SIGNING_KEY_MESSAGE);
    }
    return jwt.sign({ ...claims, iss: issuer }, privateKey, {
      algorithm: 'RS256',
      header: { alg: 'RS256', typ: 'secevent+jwt', kid: publicKey.kid },
    });
  };

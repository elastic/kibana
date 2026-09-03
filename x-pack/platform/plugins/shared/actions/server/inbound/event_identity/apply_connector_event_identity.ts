/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorTypeHasInboundEvents } from '@kbn/connector-specs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { ActionsClientContext } from '../../actions_client';
import type { RawAction } from '../../types';
import { resolveInboundEventsSpaceId } from '../ensure_connector_ingress_credentials';
import { hasConnectorEventIdentity, identityFromRawAction } from './encode_api_key';
import {
  createEventIdentityApiKeysDisabledError,
  createEventIdentityEncryptionUnavailableError,
} from './errors';
import { invalidateConnectorEventIdentity } from './invalidate_connector_event_identity';
import { mintConnectorEventIdentity } from './mint_editor_api_keys';
import type { ConnectorEventIdentity } from './types';

const getActionDecryptOptions = (context: ActionsClientContext) => {
  const spaceId = resolveInboundEventsSpaceId(context);
  return spaceId !== DEFAULT_SPACE_ID ? { namespace: spaceId } : {};
};

export const getDecryptedAction = async (
  context: ActionsClientContext,
  connectorId: string
): Promise<RawAction> => {
  const decrypted = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
    'action',
    connectorId,
    getActionDecryptOptions(context)
  );
  return decrypted.attributes;
};

export const mintInboundEventIdentityAttributes = async (
  context: ActionsClientContext,
  {
    connectorId,
    actionTypeId,
  }: {
    connectorId: string;
    actionTypeId: string;
  }
): Promise<ConnectorEventIdentity | undefined> => {
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    return undefined;
  }

  if (!context.isESOCanEncrypt) {
    throw createEventIdentityEncryptionUnavailableError();
  }

  if (!context.securityService) {
    throw createEventIdentityApiKeysDisabledError();
  }

  return mintConnectorEventIdentity({
    request: context.request,
    securityService: context.securityService,
    logger: context.logger,
    connectorId,
  });
};

export const loadPreviousConnectorEventIdentity = async (
  context: ActionsClientContext,
  connectorId: string
): Promise<ConnectorEventIdentity | undefined> => {
  try {
    const attributes = await getDecryptedAction(context, connectorId);
    return identityFromRawAction(attributes);
  } catch (err) {
    context.logger.error(
      `Failed to decrypt previous connector event identity for "${connectorId}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
};

export const invalidateStoredConnectorEventIdentity = async (
  context: ActionsClientContext,
  connectorId: string,
  identity: ConnectorEventIdentity | undefined
): Promise<void> => {
  if (!hasConnectorEventIdentity(identity) || !context.securityService) {
    return;
  }

  await invalidateConnectorEventIdentity({
    identity,
    securityService: context.securityService,
    logger: context.logger,
    connectorId,
  });
};

export const invalidateInboundConnectorEventIdentity = async (
  context: ActionsClientContext,
  connectorId: string,
  actionTypeId: string
): Promise<void> => {
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    return;
  }

  const identity = await loadPreviousConnectorEventIdentity(context, connectorId);
  await invalidateStoredConnectorEventIdentity(context, connectorId, identity);
};
